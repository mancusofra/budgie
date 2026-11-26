import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { getLocales } from 'expo-localization';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';

import { db, prepareDatabase } from './client';
import migrations from './migrations/migrations';
import { seedDatabase } from './seed';

type Props = { children: ReactNode; onReady?: () => void };

/** Opens the database (async on the web), then applies migrations and the seed. */
export function DatabaseProvider(props: Props) {
  const [prepared, setPrepared] = useState(false);
  const [prepareError, setPrepareError] = useState<Error>();
  useEffect(() => {
    prepareDatabase()
      .then(() => setPrepared(true))
      .catch(setPrepareError);
  }, []);
  if (prepareError) return <DatabaseError error={prepareError} />;
  return prepared ? <MigratedDatabase {...props} /> : null;
}

/** Applies migrations and the seed, then shows the app. `onReady` is called in both cases. */
function MigratedDatabase({ children, onReady }: Props) {
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

  if (error) return <DatabaseError error={error} />;
  return seeded ? children : null;
}

function DatabaseError({ error }: { error: Error }) {
  // On the web the database can be open in one tab only (OPFS lock)
  if (
    Platform.OS === 'web' &&
    /lock|busy|access handle|NoModificationAllowed/i.test(error.message)
  ) {
    const it = (navigator.language ?? '').startsWith('it');
    return (
      <View style={styles.center}>
        <Text variant="subtitle" style={styles.text}>
          {it ? 'Budgie è già aperto in un’altra scheda' : 'Budgie is already open in another tab'}
        </Text>
        <Text color="textSecondary" style={styles.text}>
          {it
            ? 'Chiudi l’altra scheda e ricarica questa pagina.'
            : 'Close the other tab and reload this page.'}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.center}>
      <Text variant="subtitle">Errore del database</Text>
      <Text color="textSecondary">{error.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  text: { textAlign: 'center' },
});
