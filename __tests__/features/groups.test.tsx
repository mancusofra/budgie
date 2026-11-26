/**
 * Spending groups: hooks on an in-memory SQLite DB, and the Stats card
 * rendered with a computed summary.
 */
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { addDays, addMonths, startOfMonth } from 'date-fns';

import { db, repos } from '@/db/client';
import { refreshLiveQueries } from '@/db/live-query';
import { seedDatabase } from '@/db/seed';
import { GroupsCard } from '@/features/groups/groups-card';
import { useGroupShares, useGroupsSummary, useSuggestedShares } from '@/features/groups/hooks';
import { GROUP_META, nextGroup } from '@/features/groups/meta';
import '@/i18n';
import { computeGroups, DEFAULT_SHARES, type Group } from '@/lib/groups';
import { periodRange, type Period } from '@/lib/period';

jest.mock('@/db/client', () => {
  const { createTestDb } = require('../../test-utils/db');
  const ctx = createTestDb();
  return { db: ctx.db, repos: ctx.repos, expoDb: {} };
});
jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: () => ({ remove() {} }) }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));

async function settle(action?: () => unknown) {
  await act(async () => {
    await action?.();
    refreshLiveQueries();
    await new Promise((r) => setImmediate(r));
  });
}

// Last complete month and the one before (relative to today, like the suggestion)
const lastMonth = startOfMonth(addMonths(new Date(), -1));
const twoMonthsAgo = startOfMonth(addMonths(new Date(), -2));
const period: Period = { kind: 'month', anchor: addDays(lastMonth, 10) };
const range = periodRange(period);

beforeAll(async () => {
  await seedDatabase(db, { language: 'it', currency: 'EUR' });
  const cashId = (await repos.accounts.list())[0].id;
  const expense = await repos.categories.list({ type: 'expense' });
  const income = await repos.categories.list({ type: 'income' });
  const id = (name: string) => expense.find((c) => c.name === name)!.id;
  const invest = await repos.categories.ensureSavingsCategory('Investimenti');
  const add = (type: 'expense' | 'income', categoryId: string, amount: number, date: Date) =>
    repos.transactions.create({ type, amount, accountId: cashId, categoryId, date });

  for (const month of [lastMonth, twoMonthsAgo]) {
    const d = addDays(month, 5);
    await add('income', income[0].id, 240000, d);
    await add('expense', id('Casa'), 131000, d); // Needs
    await add('expense', id('Ristoranti'), 59000, d); // Wants
    await add('expense', invest.id, 30000, d); // Savings
  }
  await repos.settings.set('groupShares', [50, 30, 20]);
});

describe('groups hooks', () => {
  it('useGroupsSummary sums the period by group with targets from the shares', async () => {
    const { result } = await renderHook(() => ({
      groups: useGroupsSummary(period, range, {}),
      shares: useGroupShares(),
    }));
    await settle();
    const { summary, shares } = result.current.groups;
    expect(shares).toEqual([50, 30, 20]);
    expect(result.current.shares).toEqual([50, 30, 20]);
    expect(summary.base).toBe(240000);
    expect(summary.groups.map((g) => g.amount)).toEqual([131000, 59000, 50000]);
    expect(summary.groups.map((g) => g.level)).toEqual(['over', 'warning', 'reached']);
  });

  it('useSuggestedShares rounds how income was split in the last months', async () => {
    const { result } = await renderHook(() => useSuggestedShares({}));
    await settle();
    // 54.6% / 24.6% / 20.8% → 55 / 25 / 20
    expect(result.current).toEqual([55, 25, 20]);
  });
});

describe('groups meta', () => {
  it('every group has a symbol and a color; nextGroup cycles', () => {
    for (const g of ['need', 'want', 'save'] as Group[]) {
      expect(GROUP_META[g].icon).toBeTruthy();
      expect(GROUP_META[g].color).toMatch(/^group/);
    }
    expect([nextGroup('need'), nextGroup('want'), nextGroup('save')]).toEqual([
      'want',
      'save',
      'need',
    ]);
  });
});

const money = (minor: number) => `€${(minor / 100).toFixed(2)}`;
const groupOf = new Map<string, Group | null>([
  ['house', 'need'],
  ['out', 'want'],
]);

describe('GroupsCard', () => {
  it('shows amounts, status and the overspending warning; Edit opens the split', async () => {
    const summary = computeGroups({
      totals: [
        { categoryId: 'salary', type: 'income', total: 100000 },
        { categoryId: 'house', type: 'expense', total: 90000 },
        { categoryId: 'out', type: 'expense', total: 20000 },
      ],
      groupOf,
      shares: DEFAULT_SHARES,
      reference: null,
    });
    await render(<GroupsCard summary={summary} shares={DEFAULT_SHARES} money={money} />);
    expect(screen.getByText('€900.00')).toBeTruthy();
    // Spending exceeds income by €100: warning and Needs over target
    expect(screen.getAllByText(/€100\.00/).length).toBeGreaterThan(1);
    expect(screen.getAllByText(/50%|30%|20%/).length).toBeGreaterThan(0);
    fireEvent.press(screen.getByText(/Modifica|Edit/));
    expect(mockPush).toHaveBeenCalledWith('/group-shares');
  });

  it('without a base invites to set a reference income', async () => {
    const summary = computeGroups({
      totals: [{ categoryId: 'house', type: 'expense', total: 5000 }],
      groupOf,
      shares: DEFAULT_SHARES,
      reference: null,
    });
    await render(<GroupsCard summary={summary} shares={DEFAULT_SHARES} money={money} />);
    fireEvent.press(screen.getByText(/riferimento|reference/i, { exact: false }));
    expect(mockPush).toHaveBeenCalledWith('/reference-income');
  });
});
