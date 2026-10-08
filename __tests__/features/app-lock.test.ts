import * as LocalAuthentication from 'expo-local-authentication';

import { authenticate } from '@/features/settings/app-lock';

// app-lock imports the settings hooks: no native DB in tests
jest.mock('@/db/client', () => ({ db: {}, repos: {}, expoDb: {} }));
jest.mock('expo-local-authentication', () => ({ authenticateAsync: jest.fn() }));

const auth = LocalAuthentication.authenticateAsync as jest.Mock;

describe('authenticate', () => {
  it('ok when authentication succeeds', async () => {
    auth.mockResolvedValueOnce({ success: true });
    expect(await authenticate('Sblocca', 'Annulla')).toBe('ok');
    expect(auth).toHaveBeenLastCalledWith({ promptMessage: 'Sblocca', cancelLabel: 'Annulla' });
  });

  it.each(['not_available', 'not_enrolled', 'passcode_not_set', 'invalid_context'])(
    "unavailable con errore %s (non chiude fuori l'utente)",
    async (error) => {
      auth.mockResolvedValueOnce({ success: false, error });
      expect(await authenticate('', '')).toBe('unavailable');
    },
  );

  it('failed if the user cancels or is not recognized', async () => {
    auth.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
    expect(await authenticate('', '')).toBe('failed');
  });

  it('unavailable if the native module throws', async () => {
    auth.mockRejectedValueOnce(new Error('missing native module'));
    expect(await authenticate('', '')).toBe('unavailable');
  });
});
