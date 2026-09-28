import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { repos } from '@/db/client';
import type { Category, CategoryType } from '@/db/schema';

export function useCategories(type?: CategoryType): Category[] {
  const { data } = useLiveQuery(repos.categories.list({ type }), [type]);
  return data ?? [];
}
