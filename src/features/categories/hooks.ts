import { useLiveQuery } from '@/db/live-query';

import { repos } from '@/db/client';
import type { Category, CategoryType } from '@/db/schema';

export function useCategories(
  type?: CategoryType,
  { includeArchived = false }: { includeArchived?: boolean } = {},
): Category[] {
  const { data } = useLiveQuery(repos.categories.list({ type, includeArchived }), [
    type,
    includeArchived,
  ]);
  return data ?? [];
}

/** undefined = loading, null = not found. */
export function useCategory(id: string | undefined): Category | undefined | null {
  const { data, updatedAt } = useLiveQuery(repos.categories.byId(id ?? ''), [id]);
  if (!id) return null;
  return updatedAt ? (data?.[0] ?? null) : undefined;
}

/** Write operations on categories (stable: the repo is a singleton). */
export const categoryActions = {
  create: repos.categories.create,
  update: repos.categories.update,
  remove: (id: string) => repos.categories.remove(id),
  setArchived: repos.categories.setArchived,
  reorder: repos.categories.reorder,
  transactionCount: (id: string) => repos.categories.transactionCount(id),
};
