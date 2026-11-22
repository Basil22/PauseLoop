import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppPicker } from '@/components/app-picker';
import { Button } from '@/components/button';
import { Notice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { StatusPill } from '@/components/status-pill';
import { Text } from '@/components/text';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useTheme } from '@/theme';

export default function OnboardingAppsScreen() {
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

  const handleContinue = async () => {
    setMessage(null);
    clearError();
    if (selected.size === 0) {
      setMessage('Choose at least one app before continuing.');
      return;
    }
    const saved = await saveTargetPackages(Array.from(selected));
    if (saved) {
      router.push('/onboarding/permissions');
    }
  };

  return (
    <Screen>
      <View style={{ gap: spacing.xl }}>
        <PageHeader
          eyebrow="Step 2 of 3"
          title="Choose your loop apps"
          description="These are the only apps PauseLoop will watch. Switch between them freely: they share one session."
          onBack={() => router.back()}
          trailing={
            <StatusPill
              label={selected.size === 0 ? 'None yet' : `${selected.size} picked`}
              tone={selected.size === 0 ? 'neutral' : 'accent'}
            />
          }
        />

        {message ? <Notice message={message} tone="warning" onDismiss={() => setMessage(null)} /> : null}
        {error ? <Notice message={error} tone="danger" onDismiss={clearError} /> : null}

        <AppPicker
          selected={selected}
          onChange={setSelected}
          search={search}
          onSearchChange={setSearch}
        />

        <View style={{ gap: 10 }}>
          <Button
            label={
              selected.size > 0
                ? `Continue with ${selected.size} ${selected.size === 1 ? 'app' : 'apps'}`
                : 'Continue'
            }
            trailingIcon="arrow-forward"
            disabled={selected.size === 0}
            loading={savingAction === 'targets'}
            onPress={() => void handleContinue()}
          />
          <Text variant="caption" align="center">
            PauseLoop cannot be selected. System apps are allowed, but they are rarely useful as
            loop apps.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
