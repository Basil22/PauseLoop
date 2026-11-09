import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { LiveDot } from '@/components/live-dot';
import { Notice } from '@/components/notice';
import { PreviewBanner } from '@/components/preview-banner';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { StatusPill } from '@/components/status-pill';
import { Text } from '@/components/text';
import { useDiagnostics } from '@/hooks/use-diagnostics';
import {
  formatClockTime,
  formatEventType,
  formatTimeAgo,
  pluralize,
  shortPackage,
} from '@/lib/format';
import { isNativeAvailable } from '@/lib/native';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

function createStyles(theme: Theme) {
  const { colors, spacing, radii } = theme;

  return StyleSheet.create({
    stack: {
      gap: spacing.xl,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    iconButton: {
      width: 46,
      height: 46,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCopy: {
      flex: 1,
      gap: 1,
    },
    headerTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 24,
      letterSpacing: -0.5,
      color: colors.text,
    },
    liveRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    liveLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    liveText: {
      fontFamily: theme.fonts.bold,
      fontSize: 11,
      letterSpacing: 1.5,
      color: colors.textTertiary,
    },
    foreground: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginTop: spacing.lg,
    },
    foregroundCopy: {
      flex: 1,
      gap: 3,
    },
    appName: {
      fontFamily: theme.fonts.bold,
      fontSize: 22,
      letterSpacing: -0.5,
      color: colors.text,
    },
    codeBox: {
      marginTop: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 13,
      paddingVertical: 11,
      gap: 7,
    },
    codeRow: {
      gap: 3,
    },
    codeLabel: {
      fontFamily: theme.fonts.bold,
      fontSize: 9,
      letterSpacing: 1.2,
      color: colors.textTertiary,
    },
    stateRows: {
      marginTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    stateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    stateLabel: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: colors.textSecondary,
    },
    sectionCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexShrink: 1,
    },
    sectionTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 19,
      letterSpacing: -0.3,
      color: colors.text,
    },
    eventList: {
      marginTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    eventRow: {
      flexDirection: 'row',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    eventRail: {
      width: 66,
      gap: 2,
    },
    eventTime: {
      fontFamily: 'monospace',
      fontSize: 11,
      color: colors.textSecondary,
    },
    eventAge: {
      fontFamily: theme.fonts.regular,
      fontSize: 10,
      color: colors.textTertiary,
    },
    eventBody: {
      flex: 1,
      gap: 4,
    },
    eventType: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    eventDot: {
      width: 5,
      height: 5,
      borderRadius: 999,
    },
    eventTypeText: {
      fontFamily: theme.fonts.bold,
      fontSize: 11,
      letterSpacing: 0.3,
      color: colors.textSecondary,
    },
    empty: {
      alignItems: 'center',
      gap: 6,
      paddingVertical: spacing.xl,
    },
    emptyIcon: {
      width: 46,
      height: 46,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 2,
    },
    decisionNote: {
      marginTop: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      padding: 13,
    },
    appsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    appsList: {
      marginTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    appRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    appCopy: {
      flex: 1,
      gap: 1,
    },
    appLabel: {
      fontFamily: theme.fonts.semibold,
      fontSize: 14,
      color: colors.text,
    },
    appPackage: {
      fontFamily: 'monospace',
      fontSize: 10,
      color: colors.textTertiary,
    },
    reloadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 11,
      paddingVertical: 7,
      backgroundColor: colors.surfaceMuted,
    },
    reloadText: {
      fontFamily: theme.fonts.semibold,
      fontSize: 11,
      color: colors.textSecondary,
    },
    footer: {
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
  });
}

export default function DebugScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [active, setActive] = useState(true);
  const { debugState, apps, events, loadingApps, refreshing, error, refresh, reloadApps } =
    useDiagnostics(active);

  useFocusEffect(
    useCallback(() => {
      setActive(true);
      return () => setActive(false);
    }, []),
  );

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const foregroundApp = apps.find(
    (app) => app.packageName === debugState?.foregroundPackage,
  );
  const foregroundLabel =
    foregroundApp?.label ??
    (debugState?.foregroundPackage
      ? shortPackage(debugState.foregroundPackage)
      : 'No foreground app');

  const sortedEvents = [...events].reverse();
  const visibleApps = apps.slice(0, 8);
  const remainingApps = Math.max(0, apps.length - visibleApps.length);

  const stateRows = [
    {
      label: 'Monitoring service',
      value: debugState?.serviceRunning ? 'Running' : 'Stopped',
      tone: debugState?.serviceRunning ? ('success' as const) : ('neutral' as const),
    },
    {
      label: 'Native overlay',
      value: debugState?.overlayVisible ? 'Visible' : 'Hidden',
      tone: debugState?.overlayVisible ? ('accent' as const) : ('neutral' as const),
    },
    {
      label: 'Screen',
      value: debugState?.screenOn ? 'Interactive' : 'Off',
      tone: debugState?.screenOn ? ('success' as const) : ('neutral' as const),
    },
    {
      label: 'Keyguard',
      value: debugState?.locked ? 'Locked' : 'Unlocked',
      tone: debugState?.locked ? ('warning' as const) : ('success' as const),
    },
  ];

  return (
    <Screen>
      <View style={styles.stack}>
        <View style={styles.header}>
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="arrow-back" size={21} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text variant="eyebrow">Phase 0</Text>
            <Text style={styles.headerTitle}>Diagnostics</Text>
          </View>
          <Pressable
            onPress={() => {
              void refresh();
              void reloadApps();
            }}
            accessibilityRole="button"
            accessibilityLabel="Refresh diagnostics"
            style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="refresh" size={20} color={colors.textSecondary} />
            )}
          </Pressable>
        </View>

        {!isNativeAvailable ? (
          <PreviewBanner message="The diagnostics below are simulated on web and in Expo Go. A real development build reports the actual Android foreground activity." />
        ) : null}

        {error ? <Notice message={error} tone="danger" /> : null}

        <Card variant="raised" padding={20}>
          <View style={styles.liveRow}>
            <View style={styles.liveLabel}>
              <LiveDot active={Boolean(debugState?.serviceRunning)} size={7} />
              <Text style={styles.liveText}>FOREGROUND SIGNAL</Text>
            </View>
            <StatusPill
              label={debugState?.serviceRunning ? 'Live · 1.5s' : 'Service off'}
              tone={debugState?.serviceRunning ? 'success' : 'neutral'}
            />
          </View>

          <View style={styles.foreground}>
            <AppIcon
              packageName={debugState?.foregroundPackage ?? 'unknown'}
              label={foregroundLabel}
              size={54}
            />
            <View style={styles.foregroundCopy}>
              <Text style={styles.appName}>{foregroundLabel}</Text>
              <Text variant="caption">
                {debugState?.foregroundPackage
                  ? 'Detected through Usage Access'
                  : 'Start monitoring to populate this card'}
              </Text>
            </View>
          </View>

          <View style={styles.codeBox}>
            <View style={styles.codeRow}>
              <Text style={styles.codeLabel}>PACKAGE</Text>
              <Text variant="mono">{debugState?.foregroundPackage ?? '—'}</Text>
            </View>
            <View style={styles.codeRow}>
              <Text style={styles.codeLabel}>ACTIVITY</Text>
              <Text variant="monoSmall">{debugState?.foregroundClass ?? '—'}</Text>
            </View>
          </View>

          <View style={styles.stateRows}>
            {stateRows.map((row) => (
              <View key={row.label} style={styles.stateRow}>
                <Text style={styles.stateLabel}>{row.label}</Text>
                <StatusPill label={row.value} tone={row.tone} />
              </View>
            ))}
          </View>
        </Card>

        <View style={{ gap: 12 }}>
          <SectionHeader
            eyebrow="Research spike"
            title="YouTube activity classes"
            description="Last 20 UsageEvents for YouTube. Metadata only — no titles, URLs, or screen content."
          />
          <Card padding={18}>
            <View style={styles.sectionCardHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="logo-youtube" size={20} color={colors.danger} />
                <Text style={styles.sectionTitle}>Spike log</Text>
              </View>
              <StatusPill
                label={pluralize(events.length, 'event')}
                tone={events.length > 0 ? 'accent' : 'neutral'}
              />
            </View>

            {sortedEvents.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="pulse-outline" size={20} color={colors.textTertiary} />
                </View>
                <Text variant="bodyStrong" align="center">
                  No YouTube events yet
                </Text>
                <Text variant="caption" align="center">
                  Open YouTube home, a long-form video, and Shorts. Keep this app monitoring, then
                  return here.
                </Text>
              </View>
            ) : (
              <View style={styles.eventList}>
                {sortedEvents.map((event, index) => (
                  <View
                    key={`${event.timestamp}-${event.type}-${index}`}
                    style={[styles.eventRow, index === sortedEvents.length - 1 ? { borderBottomWidth: 0 } : null]}
                  >
                    <View style={styles.eventRail}>
                      <Text style={styles.eventTime} numberOfLines={1}>{formatClockTime(event.timestamp)}</Text>
                      <Text style={styles.eventAge}>{formatTimeAgo(event.timestamp)}</Text>
                    </View>
                    <View style={styles.eventBody}>
                      <View style={styles.eventType}>
                        <View
                          style={[
                            styles.eventDot,
                            {
                              backgroundColor: event.type.includes('RESUMED')
                                ? colors.accent
                                : colors.textTertiary,
                            },
                          ]}
                        />
                        <Text style={styles.eventTypeText}>{formatEventType(event.type)}</Text>
                      </View>
                      <Text variant="monoSmall" numberOfLines={2}>
                        {event.className ?? 'No activity class'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.decisionNote}>
              <Text variant="caption">
                Decision rule: if Shorts exposes a distinct, stable class, document it as
                best-effort only. If home, watch, and Shorts share a class, use one YouTube
                threshold and keep the built-in Shorts reminder.
              </Text>
            </View>
          </Card>
        </View>

        <View style={{ gap: 12 }}>
          <SectionHeader
            eyebrow="Discovery"
            title="Launchable apps"
            description="Scoped launcher query only. PauseLoop is excluded; no QUERY_ALL_PACKAGES."
          />
          <Card padding={18}>
            <View style={styles.appsHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="apps-outline" size={19} color={colors.textTertiary} />
                <Text style={styles.sectionTitle}>
                  {loadingApps ? 'Loading…' : pluralize(apps.length, 'app')}
                </Text>
              </View>
              <Pressable
                onPress={() => void reloadApps()}
                accessibilityRole="button"
                accessibilityLabel="Reload installed apps"
                style={({ pressed }) => [styles.reloadButton, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="refresh" size={13} color={colors.textSecondary} />
                <Text style={styles.reloadText}>Reload</Text>
              </Pressable>
            </View>

            <View style={styles.appsList}>
              {visibleApps.map((app, index) => (
                <View
                  key={app.packageName}
                  style={[styles.appRow, index === visibleApps.length - 1 ? { borderBottomWidth: 0 } : null]}
                >
                  <AppIcon packageName={app.packageName} label={app.label} size={36} />
                  <View style={styles.appCopy}>
                    <Text style={styles.appLabel} numberOfLines={1}>
                      {app.label}
                    </Text>
                    <Text style={styles.appPackage} numberOfLines={1}>
                      {app.packageName}
                    </Text>
                  </View>
                  {app.isSystem ? <StatusPill label="System" tone="neutral" dot={false} /> : null}
                </View>
              ))}
              {!loadingApps && apps.length === 0 ? (
                <View style={styles.empty}>
                  <Text variant="bodyStrong">No launchable apps returned</Text>
                  <Text variant="caption" align="center">
                    Check package visibility and Usage Access on the device.
                  </Text>
                </View>
              ) : null}
            </View>

            {remainingApps > 0 ? (
              <Text variant="caption" style={{ marginTop: 10 }}>
                {remainingApps} more installed apps are not shown in this debug list.
              </Text>
            ) : null}
          </Card>
        </View>

        <Button
          label="Refresh all diagnostics"
          icon="refresh"
          variant="secondary"
          onPress={() => {
            void refresh();
            void reloadApps();
          }}
        />

        <View style={styles.footer}>
          <Text style={styles.footerLine}>Debug harness · No analytics · No network</Text>
          <Text variant="caption" align="center">
            This screen records package and activity metadata only.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
