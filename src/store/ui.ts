import { create } from 'zustand';

import { customPeriod, shiftPeriod, type Period, type PeriodKind } from '@/lib/period';

type UIState = {
  period: Period;
  /** Account id or "all" */
  accountFilter: string;
  /**
   * Request to open a category in the transactions list (tap on a donut
   * slice). `at` tells repeated requests for the same category apart.
   */
  openCategory?: { id: string; at: number };
  /** Layout editing in progress (Stats): the tab bar is hidden. */
  editingLayout: boolean;
  setPeriodKind: (kind: Exclude<PeriodKind, 'custom'>) => void;
  setCustomPeriod: (from: Date, to: Date) => void;
  shiftPeriod: (direction: -1 | 1) => void;
  resetPeriod: () => void;
  setAccountFilter: (id: string) => void;
  setOpenCategory: (id: string) => void;
  setEditingLayout: (editing: boolean) => void;
};

export const useUIStore = create<UIState>()((set) => ({
  period: { kind: 'month', anchor: new Date() },
  accountFilter: 'all',
  openCategory: undefined,
  editingLayout: false,
  setPeriodKind: (kind) => set((s) => ({ period: { kind, anchor: s.period.anchor } })),
  setCustomPeriod: (from, to) => set({ period: customPeriod(from, to) }),
  shiftPeriod: (direction) => set((s) => ({ period: shiftPeriod(s.period, direction) })),
  resetPeriod: () =>
    set((s) => ({
      period: { kind: s.period.kind === 'custom' ? 'month' : s.period.kind, anchor: new Date() },
    })),
  setAccountFilter: (accountFilter) => set({ accountFilter }),
  setOpenCategory: (id) => set({ openCategory: { id, at: Date.now() } }),
  setEditingLayout: (editingLayout) => set({ editingLayout }),
}));
