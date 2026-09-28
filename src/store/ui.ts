import { create } from 'zustand';

import { customPeriod, shiftPeriod, type Period, type PeriodKind } from '@/lib/period';

type UIState = {
  period: Period;
  /** id del conto o "all" */
  accountFilter: string;
  /** Filtro categoria della lista transazioni (es. da tap su uno spicchio). */
  categoryFilter?: string;
  setPeriodKind: (kind: Exclude<PeriodKind, 'custom'>) => void;
  setCustomPeriod: (from: Date, to: Date) => void;
  shiftPeriod: (direction: -1 | 1) => void;
  resetPeriod: () => void;
  setAccountFilter: (id: string) => void;
  setCategoryFilter: (id?: string) => void;
};

export const useUIStore = create<UIState>()((set) => ({
  period: { kind: 'month', anchor: new Date() },
  accountFilter: 'all',
  categoryFilter: undefined,
  setPeriodKind: (kind) => set((s) => ({ period: { kind, anchor: s.period.anchor } })),
  setCustomPeriod: (from, to) => set({ period: customPeriod(from, to) }),
  shiftPeriod: (direction) => set((s) => ({ period: shiftPeriod(s.period, direction) })),
  resetPeriod: () =>
    set((s) => ({
      period: { kind: s.period.kind === 'custom' ? 'month' : s.period.kind, anchor: new Date() },
    })),
  setAccountFilter: (accountFilter) => set({ accountFilter }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
}));
