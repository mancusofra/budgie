import { fireEvent, render, screen } from '@testing-library/react-native';

import { Keypad } from '@/components/ui/keypad';

describe('Keypad', () => {
  it('emette i tasti premuti e mostra il separatore decimale richiesto', async () => {
    const onKey = jest.fn();
    await render(<Keypad onKey={onKey} labels={{ backspace: 'Cancella' }} decimalSeparator="." />);

    await fireEvent.press(screen.getByText('7'));
    await fireEvent.press(screen.getByText('.'));
    await fireEvent.press(screen.getByLabelText('Cancella'));
    await fireEvent.press(screen.getByText('×'));

    expect(onKey.mock.calls.map(([k]) => k)).toEqual(['7', ',', 'backspace', '×']);
    expect(screen.queryByText(',')).toBeNull();
  });
});
