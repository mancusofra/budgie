import { create } from 'zustand';

import { customPeriod, shiftPeriod, type Period, type PeriodKind } from '@/lib/period';

type UIState = {
  period: Period;
  /** id del conto o "all" */
  accountFilter: string;
  /**
   * Richiesta di aprire una categoria nella lista transazioni (tap su uno
   * spicchio). `at` distingue richieste ripetute per la stessa categoria.
   */
  openCategory?: { id: string; at: number };
  setPeriodKind: (kind: Exclude<PeriodKind, 'custom'>) => void;
  setCustomPeriod: (from: Date, to: Date) => void;
  shiftPeriod: (direction: -1 | 1) => void;
  resetPeriod: () => void;
  setAccountFilter: (id: string) => void;
  setOpenCategory: (id: string) => void;
};

export const useUIStore = create<UIState>()((set) => ({
  period: { kind: 'month', anchor: new Date() },
  accountFilter: 'all',
  openCategory: undefined,
  setPeriodKind: (kind) => set((s) => ({ period: { kind, anchor: s.period.anchor } })),
  setCustomPeriod: (from, to) => set({ period: customPeriod(from, to) }),
  shiftPeriod: (direction) => set((s) => ({ period: shiftPeriod(s.period, direction) })),
  resetPeriod: () =>
    set((s) => ({
      period: { kind: s.period.kind === 'custom' ? 'month' : s.period.kind, anchor: new Date() },
    })),
  setAccountFilter: (accountFilter) => set({ accountFilter }),
  setOpenCategory: (id) => set({ openCategory: { id, at: Date.now() } }),
}));
