import { create } from 'zustand';

export type SnackbarMessage = {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Duration in ms before it disappears. */
  duration: number;
};

type SnackbarState = {
  current?: SnackbarMessage;
  show: (msg: Omit<SnackbarMessage, 'id' | 'duration'> & { duration?: number }) => void;
  hide: (id?: number) => void;
};

let nextId = 1;

export const useSnackbar = create<SnackbarState>()((set, get) => ({
  current: undefined,
  show: (msg) => set({ current: { duration: 4000, ...msg, id: nextId++ } }),
  // With an id it hides only that message (avoids closing a newer one)
  hide: (id) => {
    if (id === undefined || get().current?.id === id) set({ current: undefined });
  },
}));
