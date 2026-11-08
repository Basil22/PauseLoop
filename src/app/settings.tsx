import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { IntervalStepper } from '@/components/interval-stepper';
import { LiveDot } from '@/components/live-dot';
import { Notice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { PermissionRow } from '@/components/permission-row';
import { Screen } from '@/components/screen';
import { StatusPill } from '@/components/status-pill';
import { Text } from '@/components/text';
import { ToggleRow } from '@/components/toggle-row';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useMonitoring } from '@/hooks/use-monitoring';
import { usePermissions } from '@/hooks/use-permissions';
import { useSession } from '@/hooks/use-session';
import { clampReminderInterval, formatInterval } from '@/lib/settings';
import { useTheme } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const {
    settings,
    saveReminderInterval,
    saveSuggestions,
    saveInsights,
    savingAction,
    error,
    clearError,
    refresh: refreshSettings,
  } = useAppSettings();
  const {
    permissions,
    busyAction,
    error: permissionError,
    openUsageAccess,
    openOverlay,
    requestNotifications,
    openBatteryOptimization,
    monitoringReady,
    grantedCount,
  } = usePermissions();
  const { running, busy: monitoringBusy, error: monitoringError, toggle } = useMonitoring();
  const { session, refresh: refreshSession } = useSession();
  const [interval, setIntervalValue] = useState(5);
  const [intervalInitialized, setIntervalInitialized] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [finishingInterval, setFinishingInterval] = useState(false);
  const previousSettingsInterval = useRef(5);

  useEffect(() => {
    if (!settings || intervalInitialized) return;
    setIntervalValue(settings.reminderIntervalMinutes);
    previousSettingsInterval.current = settings.reminderIntervalMinutes;
    setIntervalInitialized(true);
  }, [intervalInitialized, settings]);

  useEffect(() => {
    if (permissionError) setNotice(permissionError);
  }, [permissionError]);

  useEffect(() => {
    if (monitoringError) setNotice(monitoringError);
  }, [monitoringError]);

  const intervalDirty = settings
    ? clampReminderInterval(interval) !== settings.reminderIntervalMinutes
    : false;

  const commitInterval = async () => {
    const minutes = clampReminderInterval(interval);
    const doSave = async () => {
      setFinishingInterval(true);
      const saved = await saveReminderInterval(minutes);
      setFinishingInterval(false);
      if (saved) {
        previousSettingsInterval.current = minutes;
        setIntervalValue(minutes);
        setNotice(
          `Reminder interval saved. ${running ? 'A fresh session started.' : 'It applies when you start monitoring.'}`,
        );
        void refreshSettings();
        void refreshSession();
      }
    };

    if (running && minutes !== previousSettingsInterval.current) {
      Alert.alert(
        'Start a fresh session?',
        `Changing the interval to ${formatInterval(minutes)} resets the current timer and snooze count while monitoring stays on.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save interval', onPress: () => void doSave() },
        ],
      );
      return;
    }
    await doSave();
  };

  const handleToggle = async () => {
    setNotice(null);
    if (!running && !monitoringReady) {
      setNotice('Usage access, Display over other apps, and Notifications are required before monitoring can start.');
      return;
    }
    const wasRunning = running;
    const ok = await toggle();
    if (ok) {
      setNotice(wasRunning ? 'Monitoring paused.' : 'Monitoring started.');
      void refreshSession();
    }
  };

  const permissionRows: {
    key: string;
    icon: IoniconName;
    title: string;
    description: string;
    granted: boolean;
    actionLabel: string;
    onPress: () => void;
    busy: boolean;
    optional?: boolean;
  }[] = [
    {
      key: 'usage',
      icon: 'analytics-outline',
      title: 'Usage access',
      description: 'Required to detect which selected app is in the foreground.',
      granted: permissions.usageAccess,
      actionLabel: 'Open settings',
      onPress: openUsageAccess,
      busy: busyAction === 'usage',
    },
    {
      key: 'overlay',
      icon: 'layers-outline',
      title: 'Display over other apps',
      description: 'Required to draw the native full-screen pause.',
      granted: permissions.overlay,
      actionLabel: 'Open settings',
      onPress: openOverlay,
      busy: busyAction === 'overlay',
    },
    {
      key: 'notifications',
      icon: 'notifications-outline',
      title: 'Notifications',
      description: 'Keeps the Android foreground service visible and compliant.',
      granted: permissions.notifications,
      actionLabel: 'Allow',
      onPress: requestNotifications,
      busy: busyAction === 'notifications',
    },
    {
      key: 'battery',
      icon: 'battery-half-outline',
      title: 'Battery optimization',
      description: 'Optional guidance for OxygenOS and other aggressive battery managers.',
      granted: permissions.batteryOptimizationIgnored,
      actionLabel: 'Review',
      onPress: openBatteryOptimization,
      busy: busyAction === 'battery',
      optional: true,
    },
  ];

  return (
    <Screen>
      <View style={{ gap: spacing.xl }}>
        <PageHeader
          eyebrow="Settings"
          title="Tune the pause"
          description="Small controls, all local. Changes apply to the next session unless monitoring restarts the timer."
          trailing={<StatusPill label={`${grantedCount}/3 ready`} tone={monitoringReady ? 'success' : 'warning'} />}
        />

        {notice ? <Notice message={notice} tone="info" onDismiss={() => setNotice(null)} /> : null}
        {error ? <Notice message={error} tone="danger" onDismiss={clearError} /> : null}

        <Card variant="raised" padding={20}>
          <View style={styles.statusRow}>
            <View style={styles.statusLabel}>
              <LiveDot active={running} size={7} />
              <Text variant="eyebrow">Monitoring</Text>
            </View>
            <StatusPill label={running ? 'Active' : 'Off'} tone={running ? 'success' : 'neutral'} />
          </View>
          <Text variant="body" style={{ marginTop: 8 }}>
            {running
              ? 'Android is watching only your selected apps. The quiet notification keeps the service alive.'
              : 'Nothing is being watched right now. Start monitoring when you want the pause to work.'}
          </Text>
          <Button
            label={running ? 'Pause monitoring' : 'Start monitoring'}
            icon={running ? 'pause' : 'play'}
            variant={running ? 'secondary' : 'primary'}
            loading={monitoringBusy}
            disabled={!running && !monitoringReady}
            onPress={() => void handleToggle()}
            style={{ marginTop: 14 }}
          />
          {!monitoringReady ? (
            <Text variant="caption" style={{ marginTop: 8 }}>
              Grant Usage access, Display over other apps, and Notifications first.
            </Text>
          ) : null}
        </Card>

        <View style={{ gap: 10 }}>
          <Text variant="eyebrow">Reminder rhythm</Text>
          <Card padding={20}>
            <Text variant="bodyStrong">Reminder interval</Text>
            <Text variant="caption" style={{ marginTop: 2 }}>
              Default is 5 minutes. Choose anywhere from 1 minute to 2 hours.
            </Text>
            <View style={{ marginTop: 14 }}>
              <IntervalStepper
                value={interval}
                onChange={setIntervalValue}
                disabled={savingAction === 'interval' || finishingInterval}
              />
            </View>
            <View style={styles.saveRow}>
              <Text variant="caption" style={{ flex: 1 }}>
                {intervalDirty
                  ? `${formatInterval(interval)} · not saved yet`
                  : `Saved: ${formatInterval(settings?.reminderIntervalMinutes ?? interval)}`}
              </Text>
              <Button
                label="Save interval"
                size="sm"
                fullWidth={false}
                disabled={!intervalDirty}
                loading={savingAction === 'interval' || finishingInterval}
                onPress={() => void commitInterval()}
              />
            </View>
            {running && intervalDirty ? (
              <Text variant="caption" style={{ marginTop: 8, color: colors.warning }}>
                Saving starts a fresh session and clears the current snooze count.
              </Text>
            ) : null}
          </Card>
        </View>

        <View style={{ gap: 10 }}>
          <Text variant="eyebrow">Pause content</Text>
          <Card padding={0} style={{ paddingHorizontal: spacing.md }}>
            <ToggleRow
              icon="leaf-outline"
              title="Show a suggestion"
              description="Adds one short, random grounding prompt to the reminder."
              value={settings?.suggestionsEnabled ?? true}
              onValueChange={(value) => void saveSuggestions(value)}
              loading={savingAction === 'suggestions'}
            />
            <ToggleRow
              icon="bar-chart-outline"
              title="Store local insights"
              description="Keeps daily totals on this phone. No per-app timeline, titles, or content."
              value={settings?.insightsEnabled ?? true}
              onValueChange={(value) => void saveInsights(value)}
              loading={savingAction === 'insights'}
              last
            />
          </Card>
        </View>

        <View style={{ gap: 10 }}>
          <View style={styles.sectionHeader}>
            <Text variant="eyebrow">Permissions</Text>
            <StatusPill label={`${grantedCount}/3`} tone={grantedCount === 3 ? 'success' : 'warning'} />
          </View>
          <Card padding={0} style={{ paddingHorizontal: spacing.md, paddingVertical: 4 }}>
            {permissionRows.map((row, index) => (
              <PermissionRow
                key={row.key}
                icon={row.icon}
                title={row.title}
                description={row.description}
                granted={row.granted}
                actionLabel={row.actionLabel}
                onPress={row.onPress}
                busy={row.busy}
                optional={row.optional}
                last={index === permissionRows.length - 1}
              />
            ))}
          </Card>
        </View>

        <Card variant="muted" padding={20}>
          <View style={styles.explainerHeader}>
            <Ionicons name="repeat-outline" size={19} color={colors.mint} />
            <Text variant="bodyStrong">How snooze and cooldown work</Text>
          </View>
          <View style={{ marginTop: 10, gap: 8 }}>
            <Text variant="body">
              Snooze hides the reminder for 5 minutes. You get two snoozes; the third reminder
              offers only Close app.
            </Text>
            <Text variant="body">
              Closing the app during a reminder starts a shared 5-minute cooldown. Reopening any
              selected app shows the countdown immediately. Closing that overlay does not shorten
              the wait.
            </Text>
            <Text variant="body">
              Staying away from all selected apps for 5 continuous minutes starts a fresh session
              with two snoozes again. Screen-off time never counts.
            </Text>
          </View>
        </Card>

        <Card padding={0}>
          <Button
            label="Privacy and data controls"
            icon="shield-checkmark-outline"
            variant="ghost"
            trailingIcon="chevron-forward"
            onPress={() => router.push('/privacy')}
          />
        </Card>

        <Text variant="caption" align="center">
          PauseLoop 0.1.0 · Phase 1 MVP · No analytics SDKs
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  explainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
});
