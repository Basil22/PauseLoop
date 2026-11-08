import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Notice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { PermissionRow } from '@/components/permission-row';
import { Screen } from '@/components/screen';
import { StatusPill } from '@/components/status-pill';
import { Text } from '@/components/text';
import { useAppSettings } from '@/hooks/use-app-settings';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function OnboardingPermissionsScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { settings, completeOnboarding, error, clearError } = useAppSettings();
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
  const [finishing, setFinishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const rows: {
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
      description: 'Required. Lets PauseLoop know which selected app is in the foreground.',
      granted: permissions.usageAccess,
      actionLabel: 'Open settings',
      onPress: openUsageAccess,
      busy: busyAction === 'usage',
    },
    {
      key: 'overlay',
      icon: 'layers-outline',
      title: 'Display over other apps',
      description: 'Required. Draws the full-screen pause reminder above the app.',
      granted: permissions.overlay,
      actionLabel: 'Open settings',
      onPress: openOverlay,
      busy: busyAction === 'overlay',
    },
    {
      key: 'notifications',
      icon: 'notifications-outline',
      title: 'Notifications',
      description: 'Keeps the monitoring service visible and Android compliant.',
      granted: permissions.notifications,
      actionLabel: 'Allow',
      onPress: requestNotifications,
      busy: busyAction === 'notifications',
    },
    {
      key: 'battery',
      icon: 'battery-half-outline',
      title: 'Battery optimization',
      description: 'Optional. Helps OxygenOS keep monitoring alive in the background.',
      granted: permissions.batteryOptimizationIgnored,
      actionLabel: 'Review',
      onPress: openBatteryOptimization,
      busy: busyAction === 'battery',
      optional: true,
    },
  ];

  const handleFinish = async () => {
    setMessage(null);
    clearError();
    if (!monitoringReady) {
      setMessage('Usage access, Display over other apps, and Notifications are all required.');
      return;
    }
    setFinishing(true);
    const saved = await completeOnboarding();
    setFinishing(false);
    if (saved) {
      router.replace('/');
    }
  };

  const selectedCount = settings?.targetPackages.length ?? 0;

  return (
    <Screen>
      <View style={{ gap: spacing.xl }}>
        <PageHeader
          eyebrow="Step 3 of 3"
          title="Grant the essentials"
          description="Each button opens the exact Android screen. PauseLoop re-checks when you come back."
          onBack={() => router.back()}
          trailing={<StatusPill label={`${grantedCount}/3 ready`} tone={grantedCount === 3 ? 'success' : 'warning'} />}
        />

        {selectedCount === 0 ? (
          <Notice
            message="No loop apps are selected yet. Go back and choose at least one."
            tone="warning"
          />
        ) : null}
        {message ? <Notice message={message} tone="warning" onDismiss={() => setMessage(null)} /> : null}
        {permissionError ? <Notice message={permissionError} tone="danger" /> : null}
        {error ? <Notice message={error} tone="danger" onDismiss={clearError} /> : null}
        {!permissions.notifications ? (
          <Notice
            message="Notifications are required so Android can show the monitoring service. Allow them here, then return to this screen."
            tone="info"
          />
        ) : null}

        <Card padding={0} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}>
          {rows.map((row, index) => (
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
              last={index === rows.length - 1}
            />
          ))}
        </Card>

        <Card variant="muted" padding={20}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.mint} />
            <Text variant="bodyStrong">Why these three?</Text>
          </View>
          <Text variant="body" style={{ marginTop: 8 }}>
            Usage access detects the foreground app. The overlay permission draws the reminder.
            Notifications keep the Android foreground service honest. PauseLoop never uses
            Accessibility, screen capture, or notification listening.
          </Text>
        </Card>

        <View style={{ gap: 10 }}>
          {selectedCount === 0 ? (
            <Button
              label="Back to app picker"
              icon="arrow-back"
              onPress={() => router.back()}
            />
          ) : (
            <Button
              label="Finish setup"
              trailingIcon="checkmark"
              disabled={!monitoringReady}
              loading={finishing}
              onPress={() => void handleFinish()}
            />
          )}
          <Text variant="caption" align="center">
            {monitoringReady
              ? 'You can start monitoring from the dashboard.'
              : 'All three required permissions unlock Finish setup.'}
          </Text>
        </View>
      </View>
    </Screen>
  );
}
