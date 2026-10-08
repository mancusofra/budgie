import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { getLocales } from 'expo-localization';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';

import { db } from './client';
import migrations from './migrations/migrations';
import { seedDatabase } from './seed';

/** Applies migrations and the seed, then shows the app. `onReady` is called in both cases. */
export function DatabaseProvider({
  children,
  onReady,
}: {
  children: ReactNode;
  onReady?: () => void;
}) {
  const { success, error: migrationError } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error>();

  useEffect(() => {
    if (!success) return;
    const locale = getLocales()[0];
    seedDatabase(db, {
      language: locale?.languageCode ?? 'en',
      currency: locale?.currencyCode ?? 'EUR',
    })
      .then(() => setSeeded(true))
      .catch(setSeedError);
  }, [success]);

  const error = migrationError ?? seedError;

  useEffect(() => {
    if (seeded || error) onReady?.();
  }, [seeded, error, onReady]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text variant="subtitle">Errore del database</Text>
        <Text color="textSecondary">{error.message}</Text>
      </View>
    );
  }

  return seeded ? children : null;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
});
