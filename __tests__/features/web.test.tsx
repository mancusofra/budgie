/**
 * Web-only helpers: file download/pick, printing, Alert replacement, dialogs,
 * install and update prompts. The few browser APIs they use are simulated.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, Platform, Text } from 'react-native';

import '@/i18n';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack() } }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// --- Minimal browser -------------------------------------------------------
Object.defineProperty(Platform, 'OS', { get: () => 'web' });
const events = new EventTarget();
const win = window as unknown as Record<string, unknown>;
win.addEventListener = events.addEventListener.bind(events);
win.removeEventListener = events.removeEventListener.bind(events);
win.dispatchEvent = events.dispatchEvent.bind(events);
win.matchMedia = () => ({ matches: false });

type FakeElement = Record<string, any>;
const created: FakeElement[] = [];
const lastCreated = (tag: string) => [...created].reverse().find((e) => e.tag === tag)!;
const docEvents = new EventTarget();
const globals = globalThis as any;
const realDocument = globals.document;

/**
 * A fake `document`, only while a test needs it: when present, some
 * libraries think they run in a real browser and rendering changes.
 */
function fakeDocument(withElements: boolean) {
  globals.document = {
    ...realDocument,
    visibilityState: 'visible',
    addEventListener: docEvents.addEventListener.bind(docEvents),
    removeEventListener: docEvents.removeEventListener.bind(docEvents),
    body: { appendChild: jest.fn() },
    createElement: withElements
      ? (tag: string) => {
          const el: FakeElement = { tag, style: {}, click: jest.fn(), remove: jest.fn() };
          if (tag === 'iframe') {
            const doc: FakeElement = { html: '', readyState: 'loading', title: '' };
            doc.open = jest.fn();
            doc.close = jest.fn();
            doc.write = (h: string) => (doc.html += h);
            el.contentDocument = doc;
            el.contentWindow = { focus: jest.fn(), print: jest.fn() };
          }
          created.push(el);
          return el;
        }
      : undefined,
  };
}
afterEach(() => {
  globals.document = realDocument;
});

describe('files', () => {
  const { downloadFile, pickTextFile, printHtml } = require('@/features/web/files');
  beforeEach(() => fakeDocument(true));

  it('downloadFile clicks a temporary link to a blob', () => {
    URL.createObjectURL = jest.fn(() => 'blob:x');
    URL.revokeObjectURL = jest.fn();
    downloadFile('backup.json', '{}', 'application/json');
    const link = lastCreated('a');
    expect(link.download).toBe('backup.json');
    expect(link.href).toBe('blob:x');
    expect(link.click).toHaveBeenCalled();
    expect(link.remove).toHaveBeenCalled();
  });

  it('pickTextFile resolves with the chosen file text, null when cancelled', async () => {
    const picked = pickTextFile('.json');
    const input = lastCreated('input');
    expect(input.accept).toBe('.json');
    input.files = [new File(['{"a":1}'], 'b.json')];
    input.onchange();
    await expect(picked).resolves.toBe('{"a":1}');

    const cancelled = pickTextFile('.json');
    lastCreated('input').oncancel();
    await expect(cancelled).resolves.toBeNull();

    const empty = pickTextFile('.json');
    const third = lastCreated('input');
    third.files = [];
    third.onchange();
    await expect(empty).resolves.toBeNull();
  });

  it('printHtml writes the document in a hidden frame and prints it once loaded', () => {
    jest.useFakeTimers();
    printHtml('<p>report</p>', 'Report');
    const frame = lastCreated('iframe');
    expect(frame.contentDocument.html).toBe('<p>report</p>');
    expect(frame.contentDocument.title).toBe('Report');
    frame.onload();
    jest.advanceTimersByTime(300);
    expect(frame.contentWindow.print).toHaveBeenCalled();
    jest.advanceTimersByTime(60_000);
    expect(frame.remove).toHaveBeenCalled();
    jest.useRealTimers();
  });
});

describe('Alert on the web', () => {
  const { installWebAlert } = require('@/features/web/alert-polyfill');
  installWebAlert();

  it('a choice uses confirm and runs the main (destructive) action on OK', () => {
    const remove = jest.fn();
    const cancel = jest.fn();
    win.confirm = jest.fn(() => true);
    Alert.alert('Delete?', 'Food', [
      { text: 'Cancel', style: 'cancel', onPress: cancel },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
    expect(win.confirm).toHaveBeenCalledWith('Delete?\n\nFood');
    expect(remove).toHaveBeenCalled();

    win.confirm = jest.fn(() => false);
    Alert.alert('Delete?', undefined, [
      { text: 'Cancel', style: 'cancel', onPress: cancel },
      { text: 'Delete', onPress: remove },
    ]);
    expect(cancel).toHaveBeenCalled();
  });

  it('a message uses alert', () => {
    win.alert = jest.fn();
    Alert.alert('Backup restored');
    expect(win.alert).toHaveBeenCalledWith('Backup restored');
  });
});

describe('dialogs and pages', () => {
  const { WebDialog, WebPage, useWideWeb } = require('@/features/web/web-frames');

  it('WebDialog closes when tapping outside', async () => {
    await render(
      <WebDialog>
        <Text>inside</Text>
      </WebDialog>,
    );
    expect(screen.getByText('inside')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Close'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('WebPage renders its content', async () => {
    await render(
      <WebPage>
        <Text>page</Text>
      </WebPage>,
    );
    expect(screen.getByText('page')).toBeTruthy();
  });

  it('useWideWeb is false on a phone-sized window', async () => {
    function Probe() {
      return <Text testID="probe">{String(useWideWeb())}</Text>;
    }
    await render(<Probe />);
    expect(screen.getByTestId('probe').props.children).toBe('false');
  });
});

describe('install and updates', () => {
  const pwa = require('@/features/web/pwa');

  it('captures the browser install prompt and uses it once', async () => {
    function Probe() {
      const install = pwa.useInstall();
      return (
        <Text testID="probe" onPress={install.prompt}>
          {`can:${install.canPrompt} installed:${install.installed}`}
        </Text>
      );
    }
    await render(<Probe />);
    const text = () => screen.getByTestId('probe').props.children;
    expect(text()).toBe('can:false installed:false');
    const prompt = jest.fn(() => Promise.resolve());
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
    });
    await act(async () => {
      events.dispatchEvent(event);
    });
    expect(text()).toBe('can:true installed:false');
    await act(async () => {
      fireEvent.press(screen.getByTestId('probe'));
    });
    expect(prompt).toHaveBeenCalled();
    expect(text()).toBe('can:false installed:false');
  });

  it('shows the update banner when a new service worker is waiting', async () => {
    const waiting = { postMessage: jest.fn() };
    const registration = {
      waiting,
      installing: null,
      update: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const sw = {
      controller: {},
      getRegistration: jest.fn(() => Promise.resolve(registration)),
      addEventListener: jest.fn(),
    };
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: sw,
      configurable: true,
    });
    fakeDocument(false);

    await render(<pwa.UpdateBanner />);
    await act(async () => {});
    fireEvent.press(await screen.findByText(/Aggiorna|Update/));
    expect(waiting.postMessage).toHaveBeenCalledWith('SKIP_WAITING');
    await act(async () => {
      fireEvent.press(screen.getByLabelText(/Più tardi|Later/));
    });
    expect(screen.queryByText(/Aggiorna|Update/)).toBeNull();
  });
});
