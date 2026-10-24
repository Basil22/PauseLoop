import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  View,
  type TextStyle,
} from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { LiveDot } from '@/components/live-dot';
import { Metric } from '@/components/metric';
import { Notice } from '@/components/notice';
import { PermissionRow } from '@/components/permission-row';
import { PreviewBanner } from '@/components/preview-banner';
import { ReminderPreview } from '@/components/reminder-preview';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { StatusOrb } from '@/components/status-orb';
import { StatusPill } from '@/components/status-pill';
import { Text } from '@/components/text';
import { useInstalledApps } from '@/hooks/use-diagnostics';
import { useMonitoring } from '@/hooks/use-monitoring';
import { usePermissions } from '@/hooks/use-permissions';
import { isNativeAvailable, native } from '@/lib/native';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type NoticeTone = 'info' | 'success' | 'warning' | 'danger';
type NoticeState = { message: string; tone: NoticeTone };

const PRIVACY_CHIPS: { icon: IoniconName; label: string }[] = [
  { icon: 'eye-off-outline', label: 'No screen capture' },
  { icon: 'chatbubbles-outline', label: 'No messages' },
  { icon: 'accessibility-outline', label: 'No Accessibility' },
];

function createStyles(theme: Theme) {
  const { colors, spacing, radii } = theme;

  return StyleSheet.create({
    stack: {
      gap: spacing.xl,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      flexShrink: 1,
    },
    brandCopy: {
      gap: 1,
    },
    wordmark: {
      fontFamily: theme.fonts.extrabold,
      fontSize: 17,
      letterSpacing: -0.3,
      color: colors.text,
    },
    phase: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.pill,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    phaseText: {
      fontFamily: theme.fonts.bold,
      fontSize: 10,
      letterSpacing: 1.2,
      color: colors.textSecondary,
    },
    hero: {
      gap: 10,
      marginTop: spacing.xs,
    },
    heroTitle: {
      marginTop: 2,
    },
    heroTitleAccent: {
      color: colors.accent,
    },
    heroCopy: {
      maxWidth: 520,
    },
    monitoringTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    monitoringLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    monitoringLabelText: {
      fontFamily: theme.fonts.bold,
      fontSize: 12,
      letterSpacing: 1.4,
      color: colors.textTertiary,
    },
    monitoringBody: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.lg,
      marginTop: spacing.lg,
    },
    monitoringCopy: {
      flex: 1,
      minWidth: 180,
      gap: 5,
    },
    monitoringTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.45,
      color: colors.text,
    },
    permissionHint: {
      marginTop: spacing.xs,
    },
    metrics: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: spacing.md,
      marginTop: spacing.lg,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexWrap: 'wrap',
    },
    metricDivider: {
      width: 1,
      alignSelf: 'stretch',
      backgroundColor: colors.border,
    },
    permissionsCard: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    sectionGap: {
      gap: spacing.sm,
    },
    labHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    labIcon: {
      width: 42,
      height: 42,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    labCopy: {
      flex: 1,
      gap: 1,
    },
    labTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 18,
      letterSpacing: -0.3,
      color: colors.text,
    },
    labBody: {
      marginTop: spacing.md,
    },
    labActions: {
      gap: 9,
      marginTop: spacing.lg,
    },
    privacyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    privacyIcon: {
      width: 42,
      height: 42,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceStrong,
      borderWidth: 1,
      borderColor: colors.border,
    },
    privacyTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 17,
      letterSpacing: -0.25,
      color: colors.text,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: spacing.md,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    chipText: {
      fontFamily: theme.fonts.semibold,
      fontSize: 11,
      color: colors.textSecondary,
    } satisfies TextStyle,
    footer: {
      marginTop: spacing.xs,
      alignItems: 'center',
      gap: 4,
    },
    footerLine: {
      fontFamily: theme.fonts.semibold,
      fontSize: 11,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: colors.textTertiary,
      textAlign: 'center',
    },
    appPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: spacing.md,
    },
    appPreviewCopy: {
      flex: 1,
    },
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    permissions,
    loading: permissionsLoading,
    busyAction,
    error: permissionError,
    refresh: refreshPermissions,
    openUsageAccess,
    openOverlay,
    requestNotifications,
    openBatteryOptimization,
    monitoringReady,
    grantedCount,
  } = usePermissions();
  const {
    running,
    busy: monitoringBusy,
    error: monitoringError,
    toggle,
  } = useMonitoring();
  const { apps, loading: appsLoading } = useInstalledApps();

  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testPending, setTestPending] = useState(false);
  const [reveal] = useState(() => new Animated.Value(0));
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshPermissions();
    }, [refreshPermissions]),
  );

  useEffect(() => {
    Animated.timing(reveal, {
      toValue: 1,
      duration: 480,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [reveal]);

  useEffect(() => {
    if (permissionError) {
      setNotice({ message: permissionError, tone: 'danger' });
    }
  }, [permissionError]);

  useEffect(() => {
    if (monitoringError) {
      setNotice({ message: monitoringError, tone: 'danger' });
    }
  }, [monitoringError]);

  useEffect(() => {
    if (!isNativeAvailable) return;
    const subscription = native.addListener('onOverlayAction', ({ action }) => {
      switch (action) {
        case 'blocked':
          setTestStatus('No reminder shown. Switch away from PauseLoop before it fires.');
          setTestPending(false);
          break;
        case 'failed':
          setTestStatus('The overlay could not be drawn. Check “Display over other apps”.');
          setTestPending(false);
          break;
        case 'close':
          setTestStatus('Close app sent you Home. Cooldown arrives in Phase 1.');
          setTestPending(false);
          break;
        case 'snooze':
          setTestStatus('Test reminder snoozed. Phase 1 adds the five-minute re-arm.');
          setTestPending(false);
          break;
        case 'dismissed':
          setTestStatus('Reminder dismissed because the foreground app changed.');
          setTestPending(false);
          break;
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    return () => {
      if (pendingTimer.current) {
        clearTimeout(pendingTimer.current);
      }
    };
  }, []);

  const handleToggle = async () => {
    if (!running && !monitoringReady) {
      setNotice({
        message: 'Grant Usage access and Display over other apps before monitoring.',
        tone: 'warning',
      });
      return;
    }
    const wasRunning = running;
    const ok = await toggle();
    if (ok) {
      setNotice({
        message: wasRunning
          ? 'Monitoring paused. The foreground notification is gone.'
          : 'Monitoring is active. A quiet notification is keeping the service alive.',
        tone: wasRunning ? 'info' : 'success',
      });
    }
  };

  const handleShowReminder = async () => {
    if (!running) {
      setNotice({
        message: 'Start monitoring before testing the native overlay.',
        tone: 'warning',
      });
      return;
    }

    if (!isNativeAvailable) {
      setPreviewVisible(true);
      return;
    }

    setTestPending(true);
    setTestStatus('Switch to another app now — the reminder fires in 3 seconds.');
    try {
      await native.showTestOverlay(3_000);
      if (pendingTimer.current) {
        clearTimeout(pendingTimer.current);
      }
      pendingTimer.current = setTimeout(() => setTestPending(false), 4_200);
    } catch (caught) {
      setTestPending(false);
      setTestStatus(caught instanceof Error ? caught.message : 'The test reminder could not start.');
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
      description: 'Lets PauseLoop know which app is in the foreground.',
      granted: permissions.usageAccess,
      actionLabel: 'Grant',
      onPress: openUsageAccess,
      busy: busyAction === 'usage',
    },
    {
      key: 'overlay',
      icon: 'layers-outline',
      title: 'Display over other apps',
      description: 'Powering the full-screen pause reminder.',
      granted: permissions.overlay,
      actionLabel: 'Grant',
      onPress: openOverlay,
      busy: busyAction === 'overlay',
    },
    {
      key: 'notifications',
      icon: 'notifications-outline',
      title: 'Notifications',
      description: 'Keeps the monitoring service visible and honest.',
      granted: permissions.notifications,
      actionLabel: 'Allow',
      onPress: requestNotifications,
      busy: busyAction === 'notifications',
    },
    {
      key: 'battery',
      icon: 'battery-half-outline',
      title: 'Battery optimization',
      description: 'Optional. Helps OxygenOS keep the service alive.',
      granted: permissions.batteryOptimizationIgnored,
      actionLabel: 'Review',
      onPress: openBatteryOptimization,
      busy: busyAction === 'battery',
      optional: true,
    },
  ];

  const foregroundApp = apps.find(
    (app) => app.packageName === 'com.google.android.youtube',
  );

  return (
    <Screen>
      <Animated.View
        style={[
          styles.stack,
          {
            opacity: reveal,
            transform: [
              {
                translateY: reveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <BrandMark size={34} />
            <View style={styles.brandCopy}>
              <Text style={styles.wordmark}>PauseLoop</Text>
              <Text variant="caption">Stop doomscrolling</Text>
            </View>
          </View>
          <View style={styles.phase}>
            <LiveDot active={running} size={6} />
            <Text style={styles.phaseText}>PHASE 0</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text variant="eyebrow" tone="secondary">
            Digital wellbeing · Android
          </Text>
          <View style={styles.heroTitle}>
            <Text variant="display">Break the loop.</Text>
            <Text variant="display" style={styles.heroTitleAccent}>
              Take the pause.
            </Text>
          </View>
          <Text variant="body" style={styles.heroCopy}>
            A quiet full-screen reminder after a stretch of doomscrolling. No account. No cloud.
            No judgment.
          </Text>
        </View>

        {!isNativeAvailable ? <PreviewBanner /> : null}

        {notice ? (
          <Notice
            message={notice.message}
            tone={notice.tone}
            onDismiss={() => setNotice(null)}
          />
        ) : null}

        <Card variant="raised" padding={22}>
          <View style={styles.monitoringTop}>
            <View style={styles.monitoringLabel}>
              <LiveDot active={running} size={7} />
              <Text style={styles.monitoringLabelText}>MONITORING</Text>
            </View>
            <StatusPill
              label={running ? 'Active' : 'Idle'}
              tone={running ? 'success' : 'neutral'}
            />
          </View>

          <View style={styles.monitoringBody}>
            <StatusOrb active={running} size={96} />
            <View style={styles.monitoringCopy}>
              <Text style={styles.monitoringTitle}>
                {running ? 'Standing by for the loop.' : 'The pause starts here.'}
              </Text>
              <Text variant="body">
                {running
                  ? 'The foreground service is checking only the app in front of you.'
                  : 'Complete setup, then start the native monitoring service.'}
              </Text>
            </View>
          </View>

          <Button
            label={running ? 'Pause monitoring' : 'Start monitoring'}
            icon={running ? 'pause' : 'play'}
            variant={running ? 'secondary' : 'primary'}
            loading={monitoringBusy}
            disabled={!running && !monitoringReady}
            onPress={handleToggle}
            style={{ marginTop: 20 }}
          />
          {!running && !monitoringReady ? (
            <Text variant="caption" style={styles.permissionHint}>
              {permissionsLoading
                ? 'Checking permissions…'
                : 'Grant Usage access and Display over other apps to enable monitoring.'}
            </Text>
          ) : !running && !permissions.notifications ? (
            <Text variant="caption" style={styles.permissionHint}>
              You can start now, but Android needs notification permission to show the service
              notification.
            </Text>
          ) : null}

          <View style={styles.metrics}>
            <Metric
              value={appsLoading ? '—' : String(apps.length)}
              label="Launchable apps found"
            />
            <View style={styles.metricDivider} />
            <Metric
              value={`${grantedCount}/3`}
              label="Permissions ready"
              tone={grantedCount === 3 ? 'accent' : 'warning'}
            />
            <View style={styles.metricDivider} />
            <Metric
              value={running ? 'On' : 'Off'}
              label="Foreground service"
              tone={running ? 'accent' : 'default'}
            />
          </View>
        </Card>

        <View style={styles.sectionGap}>
          <SectionHeader
            eyebrow="Setup"
            title="Permission health"
            description="Each row opens the exact Android screen. Status re-checks whenever you come back."
          />
          <Card padding={0} style={styles.permissionsCard}>
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

        <Card variant="accent" padding={20}>
          <View style={styles.labHeader}>
            <View style={styles.labIcon}>
              <Ionicons name="flask-outline" size={20} color={theme.colors.accent} />
            </View>
            <View style={styles.labCopy}>
              <Text style={styles.labTitle}>Reminder lab</Text>
              <Text variant="caption">Phase 0 · native overlay test</Text>
            </View>
            <StatusPill label="DEBUG" tone="accent" dot={false} />
          </View>

          <Text variant="body" style={styles.labBody}>
            {isNativeAvailable
              ? 'Start monitoring, then switch to another app before the three-second timer fires. The reminder is drawn by Android, not React Native.'
              : 'Open a full-screen preview of the reminder. The real version is drawn by Android over the current app.'}
          </Text>

          {testStatus ? (
            <View style={{ marginTop: 14 }}>
              <Notice message={testStatus} tone="info" onDismiss={() => setTestStatus(null)} />
            </View>
          ) : null}

          <View style={styles.labActions}>
            <Button
              label={isNativeAvailable ? 'Show test reminder' : 'Preview reminder'}
              icon="pause-circle-outline"
              loading={testPending}
              disabled={!running || testPending}
              onPress={handleShowReminder}
            />
            <Button
              label="Open diagnostics"
              icon="terminal-outline"
              variant="secondary"
              onPress={() => router.push('/debug')}
            />
          </View>
          {!running ? (
            <Text variant="caption" style={{ marginTop: 10 }}>
              Start monitoring to unlock the overlay test.
            </Text>
          ) : null}
        </Card>

        <Card variant="muted" padding={20}>
          <View style={styles.privacyHeader}>
            <View style={styles.privacyIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.mint} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.privacyTitle}>On-device by design</Text>
              <Text variant="caption">Release builds ship without the Internet permission.</Text>
            </View>
          </View>
          <Text variant="body" style={{ marginTop: 12 }}>
            Usage access stays on this phone. PauseLoop never reads messages, records the screen,
            or uses Accessibility services.
          </Text>
          <View style={styles.chips}>
            {PRIVACY_CHIPS.map((chip) => (
              <View key={chip.label} style={styles.chip}>
                <Ionicons name={chip.icon} size={12} color={theme.colors.textTertiary} />
                <Text style={styles.chipText}>{chip.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        {foregroundApp ? (
          <View style={styles.appPreview}>
            <AppIcon packageName={foregroundApp.packageName} label={foregroundApp.label} size={30} />
            <Text variant="caption" style={styles.appPreviewCopy}>
              A familiar loop: {foregroundApp.label} is installed and discoverable without
              QUERY_ALL_PACKAGES.
            </Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerLine}>Break the loop · Take the pause</Text>
          <Text variant="caption" align="center">
            PauseLoop Phase 0 · Debug harness, not a finished product
          </Text>
        </View>
      </Animated.View>

      <ReminderPreview
        visible={previewVisible}
        appName={foregroundApp?.label ?? 'YouTube'}
        onClose={() => setPreviewVisible(false)}
      />
    </Screen>
  );
}
