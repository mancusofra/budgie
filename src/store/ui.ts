import { create } from 'zustand';

import { shiftPeriod, type Period, type PeriodKind } from '@/lib/period';

type UIState = {
  period: Period;
  /** id del conto o "all" */
  accountFilter: string;
  setPeriodKind: (kind: PeriodKind) => void;
  shiftPeriod: (direction: -1 | 1) => void;
  resetPeriod: () => void;
  setAccountFilter: (id: string) => void;
};

export const useUIStore = create<UIState>()((set) => ({
  period: { kind: 'month', anchor: new Date() },
  accountFilter: 'all',
  setPeriodKind: (kind) => set((s) => ({ period: { kind, anchor: s.period.anchor } })),
  shiftPeriod: (direction) => set((s) => ({ period: shiftPeriod(s.period, direction) })),
  resetPeriod: () => set((s) => ({ period: { kind: s.period.kind, anchor: new Date() } })),
  setAccountFilter: (accountFilter) => set({ accountFilter }),
}));
