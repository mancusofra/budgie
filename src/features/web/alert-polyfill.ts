import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * React Native's Alert does nothing in the browser: confirmations (restore a
 * backup, delete a category…) would never appear. On the web it is replaced
 * with the browser's dialogs: OK/Cancel for a choice, a simple message otherwise.
 */
export function installWebAlert() {
  if (Platform.OS !== 'web') return;
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const actions = (buttons ?? []).filter((b) => b.style !== 'cancel');
    const cancel = (buttons ?? []).find((b) => b.style === 'cancel');
    if (actions.length === 0) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }
    // A choice: the main action (destructive one if present) on OK
    const main = actions.find((b) => b.style === 'destructive') ?? actions[actions.length - 1];
    if (window.confirm(text)) main.onPress?.();
    else cancel?.onPress?.();
  };
}
