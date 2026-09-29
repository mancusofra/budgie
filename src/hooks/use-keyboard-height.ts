import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** Altezza della tastiera quando è aperta (0 se chiusa). */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // Su iOS gli eventi "will" permettono di muoversi insieme alla tastiera
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subs = [
      Keyboard.addListener(show, (e) => setHeight(e.endCoordinates.height)),
      Keyboard.addListener(hide, () => setHeight(0)),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  return height;
}
