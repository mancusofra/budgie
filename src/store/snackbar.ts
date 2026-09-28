import { create } from 'zustand';

export type SnackbarMessage = {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Durata in ms prima che sparisca. */
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
  show: (msg) => set({ current: { duration: 5000, ...msg, id: nextId++ } }),
  // Con un id nasconde solo quel messaggio (evita di chiuderne uno più recente)
  hide: (id) => {
    if (id === undefined || get().current?.id === id) set({ current: undefined });
  },
}));
