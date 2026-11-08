import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { AppPicker } from '@/components/app-picker';
import { Button } from '@/components/button';
import { Notice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { StatusPill } from '@/components/status-pill';
import { Text } from '@/components/text';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useTheme } from '@/theme';

export default function AppsScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { settings, selectedPackages, saveTargetPackages, savingAction, error, clearError } =
    useAppSettings();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(selectedPackages));
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !settings) return;
    initialized.current = true;
    setSelected(new Set(settings.targetPackages));
  }, [settings]);

  const unchanged =
    selected.size === selectedPackages.size &&
    Array.from(selected).every((packageName) => selectedPackages.has(packageName));

  const handleSave = async () => {
    setMessage(null);
    clearError();
    if (selected.size === 0) {
      setMessage('Keep at least one app selected, or pause monitoring first.');
      return;
    }
    const saved = await saveTargetPackages(Array.from(selected));
    if (saved) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    }
  };

  const handleClear = () => {
    const clear = () => setSelected(new Set());
    if (Platform.OS === 'web') {
      clear();
      return;
    }
    Alert.alert(
      'Clear the loop list?',
      'Choose Save changes afterward. If monitoring is running, it stops because there is nothing to watch.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear list', style: 'destructive', onPress: clear },
      ],
    );
  };

  return (
    <Screen>
      <View style={{ gap: spacing.xl }}>
        <PageHeader
          eyebrow="Loop list"
          title="Choose what counts"
          description="A session is shared across every selected app. Search by name or package; PauseLoop itself is excluded."
          trailing={
            <StatusPill
              label={selected.size === 0 ? 'None yet' : `${selected.size} selected`}
              tone={selected.size === 0 ? 'neutral' : 'accent'}
            />
          }
        />

        {message ? <Notice message={message} tone="warning" onDismiss={() => setMessage(null)} /> : null}
        {error ? <Notice message={error} tone="danger" onDismiss={clearError} /> : null}

        <View style={styles.hintRow}>
          <Text variant="caption" style={{ flex: 1 }}>
            Suggested loop apps appear first only when they are actually installed.
          </Text>
          {selected.size > 0 ? (
            <Button
              label="Clear list"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={handleClear}
            />
          ) : null}
        </View>

        <AppPicker
          selected={selected}
          onChange={setSelected}
          search={search}
          onSearchChange={setSearch}
        />

        <View style={{ gap: 10 }}>
          <Button
            label={
              unchanged
                ? 'No changes to save'
                : `Save ${selected.size} ${selected.size === 1 ? 'app' : 'apps'}`
            }
            icon="checkmark"
            disabled={selected.size === 0 || unchanged}
            loading={savingAction === 'targets'}
            onPress={() => void handleSave()}
          />
          <Text variant="caption" align="center">
            Removing all apps stops monitoring. Your other settings and local history stay.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
});
