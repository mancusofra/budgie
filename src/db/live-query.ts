import { getTableName, type Table } from 'drizzle-orm';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useState } from 'react';

/**
 * Come useLiveQuery di Drizzle, ma si riesegue quando cambia una qualsiasi
 * delle tabelle indicate (quello di Drizzle ascolta solo la tabella del FROM,
 * quindi ignora join e subquery: es. saldi dei conti o nomi di categoria).
 */
export function useLiveQueryOn<T>(
  query: PromiseLike<T>,
  tables: Table[],
  deps: unknown[] = [],
): { data: T | undefined; updatedAt: Date | undefined; error: unknown } {
  const [data, setData] = useState<T>();
  const [updatedAt, setUpdatedAt] = useState<Date>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let cancelled = false;
    const run = () =>
      query.then(
        (result) => {
          if (cancelled) return;
          setData(result);
          setUpdatedAt(new Date());
        },
        (e) => !cancelled && setError(e),
      );
    run();
    const names = new Set(tables.map((t) => getTableName(t)));
    const listener = addDatabaseChangeListener(({ tableName }) => {
      if (names.has(tableName)) run();
    });
    return () => {
      cancelled = true;
      listener.remove();
    };
    // La query viene ricreata a ogni render: si riesegue solo quando cambiano le deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, updatedAt, error };
}
