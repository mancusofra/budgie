/** Sezioni della schermata Statistiche, nell'ordine predefinito. */
export const STATS_SECTIONS = ['summary', 'chart', 'categories', 'budgets'] as const;

export type StatsSection = (typeof STATS_SECTIONS)[number];

export type StatsLayout = { order: StatsSection[]; hidden: StatsSection[] };

const isSection = (s: unknown): s is StatsSection =>
  typeof s === 'string' && (STATS_SECTIONS as readonly string[]).includes(s);

/**
 * Layout salvato reso valido: sezioni sconosciute scartate, duplicati rimossi,
 * sezioni nuove (aggiunte in versioni successive) in fondo e visibili.
 */
export function normalizeStatsLayout(saved?: Partial<StatsLayout> | null): StatsLayout {
  const order = [...new Set((saved?.order ?? []).filter(isSection))];
  for (const s of STATS_SECTIONS) if (!order.includes(s)) order.push(s);
  const hidden = [...new Set((saved?.hidden ?? []).filter(isSection))];
  return { order, hidden };
}

export function toggleHidden(layout: StatsLayout, section: StatsSection): StatsLayout {
  const hidden = layout.hidden.includes(section)
    ? layout.hidden.filter((s) => s !== section)
    : [...layout.hidden, section];
  return { ...layout, hidden };
}

export function visibleSections(layout: StatsLayout): StatsSection[] {
  return layout.order.filter((s) => !layout.hidden.includes(s));
}

/**
 * Nuovo ordine dopo il trascinamento delle sezioni visibili: le nascoste
 * restano in fondo, nell'ordine in cui erano.
 */
export function withVisibleOrder(layout: StatsLayout, visible: StatsSection[]): StatsLayout {
  const rest = layout.order.filter((s) => !visible.includes(s));
  return { ...layout, order: [...visible, ...rest] };
}
