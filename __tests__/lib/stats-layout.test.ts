import {
  normalizeStatsLayout,
  showFirst,
  STATS_SECTIONS,
  toggleHidden,
  visibleSections,
  withoutSections,
} from '@/lib/stats-layout';

describe('Stats layout', () => {
  it('with nothing saved uses the default order, everything visible', () => {
    expect(normalizeStatsLayout(undefined)).toEqual({ order: [...STATS_SECTIONS], hidden: [] });
  });

  it('drops unknown sections and duplicates, appends the missing ones', () => {
    const layout = normalizeStatsLayout({
      order: ['budgets', 'old-widget' as never, 'chart', 'budgets'],
      hidden: ['chart', 'nope' as never],
    });
    expect(layout).toEqual({
      order: ['budgets', 'chart', 'summary', 'categories', 'groups'],
      hidden: ['chart'],
    });
  });

  it('hides and shows a section', () => {
    const base = normalizeStatsLayout();
    const hidden = toggleHidden(base, 'chart');
    expect(visibleSections(hidden)).toEqual(['summary', 'categories', 'budgets', 'groups']);
    expect(visibleSections(toggleHidden(hidden, 'chart'))).toEqual([...STATS_SECTIONS]);
  });

  it('showFirst puts a section on top and visible; withoutSections removes it', () => {
    const base = toggleHidden(normalizeStatsLayout(), 'groups');
    const first = showFirst(base, 'groups');
    expect(first.order[0]).toBe('groups');
    expect(first.hidden).toEqual([]);
    expect(withoutSections(first, ['groups'])).toEqual({
      order: ['summary', 'chart', 'categories', 'budgets'],
      hidden: [],
    });
  });
});
