/** Sections of the Stats screen, in the default order. */
export const STATS_SECTIONS = ['summary', 'chart', 'categories', 'budgets'] as const;

export type StatsSection = (typeof STATS_SECTIONS)[number];

export type StatsLayout = { order: StatsSection[]; hidden: StatsSection[] };

const isSection = (s: unknown): s is StatsSection =>
  typeof s === 'string' && (STATS_SECTIONS as readonly string[]).includes(s);

/**
 * Saved layout made valid: unknown sections dropped, duplicates removed,
 * new sections (added in later versions) appended at the end and visible.
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
