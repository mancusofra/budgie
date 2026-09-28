import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { repos } from '@/db/client';
import type { Account } from '@/db/schema';

export function useAccounts(): Account[] {
  const { data } = useLiveQuery(repos.accounts.list());
  return data ?? [];
}
