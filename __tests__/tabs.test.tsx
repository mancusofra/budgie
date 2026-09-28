import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

describe('HomeScreen', () => {
  it('mostra il titolo', async () => {
    await render(<HomeScreen />);
    expect(screen.getByText('Home')).toBeTruthy();
  });
});
