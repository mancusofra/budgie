import {
  normalizeStatsLayout,
  STATS_SECTIONS,
  toggleHidden,
  visibleSections,
} from '@/lib/stats-layout';

describe('layout Statistiche', () => {
  it('senza salvataggi usa l’ordine predefinito, tutto visibile', () => {
    expect(normalizeStatsLayout(undefined)).toEqual({ order: [...STATS_SECTIONS], hidden: [] });
  });

  it('scarta sezioni sconosciute e duplicati, aggiunge in fondo quelle mancanti', () => {
    const layout = normalizeStatsLayout({
      order: ['budgets', 'old-widget' as never, 'chart', 'budgets'],
      hidden: ['chart', 'nope' as never],
    });
    expect(layout).toEqual({
      order: ['budgets', 'chart', 'summary', 'categories'],
      hidden: ['chart'],
    });
  });

  it('nasconde e mostra una sezione', () => {
    const base = normalizeStatsLayout();
    const hidden = toggleHidden(base, 'chart');
    expect(visibleSections(hidden)).toEqual(['summary', 'categories', 'budgets']);
    expect(visibleSections(toggleHidden(hidden, 'chart'))).toEqual([...STATS_SECTIONS]);
  });
});
