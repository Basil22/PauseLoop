import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Platform, Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Notice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { StatusPill } from '@/components/status-pill';
import { Text } from '@/components/text';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useHistoryStatus } from '@/hooks/use-history-status';
import { formatHistoryDate, formatLongDuration } from '@/lib/settings';
import { useTheme } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const NEVER_COLLECTED: { icon: IoniconName; label: string }[] = [
  { icon: 'chatbubbles-outline', label: 'Messages or notifications' },
  { icon: 'videocam-outline', label: 'Screen recordings or screenshots' },
  { icon: 'document-text-outline', label: 'Video titles, URLs, or searches' },
  { icon: 'keypad-outline', label: 'Keystrokes or passwords' },
  { icon: 'accessibility-outline', label: 'Accessibility content' },
  { icon: 'cloud-upload-outline', label: 'Anything sent to a server' },
];

export default function PrivacyScreen() {
  const { colors, spacing } = useTheme();
  const { settings, saveInsights, savingAction } = useAppSettings();
  const { history, loading, clearing, error, refresh, clear } = useHistoryStatus();

  const performClear = async () => {
    const done = await clear();
    if (done) {
      void refresh();
    }
  };

  const confirmClear = () => {
    if (Platform.OS === 'web') {
      void performClear();
      return;
    }
    Alert.alert(
      'Clear local history?',
      'This deletes all daily totals stored by PauseLoop on this phone. Monitoring preferences and your app list stay in place. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear history', style: 'destructive', onPress: () => void performClear() },
      ],
    );
  };

  const hasHistory = (history?.daysStored ?? 0) > 0;
  const insightsEnabled = settings?.insightsEnabled ?? true;

  return (
    <Screen>
      <View style={{ gap: spacing.xl }}>
        <PageHeader
          eyebrow="Privacy & data"
          title="Nothing leaves this phone"
          description="PauseLoop is a local Android utility. It has no account system, no analytics SDK, and no server to send data to."
          trailing={<StatusPill label="On-device" tone="success" />}
        />

        {error ? <Notice message={error} tone="danger" /> : null}

        <Card variant="raised" padding={20}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.iconTile,
                {
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.borderStrong,
                },
              ]}
            >
              <Ionicons name="shield-checkmark-outline" size={21} color={colors.accent} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text variant="bodyStrong">Local insights</Text>
              <Text variant="caption">
                {insightsEnabled
                  ? 'Daily totals are stored in the app’s private database.'
                  : 'Local insight storage is currently off.'}
              </Text>
            </View>
            <StatusPill
              label={insightsEnabled ? 'On' : 'Off'}
              tone={insightsEnabled ? 'success' : 'neutral'}
            />
          </View>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text
                style={{
                  fontFamily: 'Manrope_800ExtraBold',
                  fontSize: 24,
                  color: colors.text,
                }}
              >
                {loading ? '—' : String(history?.daysStored ?? 0)}
              </Text>
              <Text variant="caption">days with totals</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text
                style={{
                  fontFamily: 'Manrope_800ExtraBold',
                  fontSize: 24,
                  color: colors.text,
                }}
              >
                {loading ? '—' : formatLongDuration(history?.totalMonitoredMs ?? 0)}
              </Text>
              <Text variant="caption">monitored time stored</Text>
            </View>
          </View>

          <View style={styles.metaRows}>
            <View style={styles.metaRow}>
              <Text variant="label" tone="secondary">
                Oldest day
              </Text>
              <Text variant="caption">{formatHistoryDate(history?.oldestDate ?? null)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text variant="label" tone="secondary">
                Newest day
              </Text>
              <Text variant="caption">{formatHistoryDate(history?.newestDate ?? null)}</Text>
            </View>
            <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
              <Text variant="label" tone="secondary">
                Automatic deletion
              </Text>
              <Text variant="caption">
                After {history?.retentionDays ?? 90} days
              </Text>
            </View>
          </View>

          <View style={{ gap: 9, marginTop: 14 }}>
            <Button
              label={insightsEnabled ? 'Turn off local insights' : 'Turn on local insights'}
              icon={insightsEnabled ? 'pause-outline' : 'play-outline'}
              variant="secondary"
              loading={savingAction === 'insights'}
              onPress={() => void saveInsights(!insightsEnabled)}
            />
            <Button
              label={hasHistory ? 'Clear local history' : 'No history to clear'}
              icon="trash-outline"
              variant="danger"
              disabled={!hasHistory || clearing}
              loading={clearing}
              onPress={confirmClear}
            />
          </View>
          {!insightsEnabled ? (
            <Text variant="caption" style={{ marginTop: 10, color: colors.warning }}>
              Monitoring still works, but new daily totals are not stored. Existing totals remain
              until you clear them.
            </Text>
          ) : null}
        </Card>

        <Card padding={20}>
          <Text variant="eyebrow">What is stored</Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            <Text variant="body">
              Only while monitoring is on: the selected app’s package name, the local date,
              cumulative foreground milliseconds, session starts, reminder count, snooze count,
              close count, and cooldown count.
            </Text>
            <Text variant="body">
              That is the whole database. There is no raw event timeline, no URLs, no titles, and
              no screen content. Rows older than 90 days are deleted automatically.
            </Text>
          </View>
        </Card>

        <Card variant="muted" padding={20}>
          <Text variant="eyebrow">Never collected</Text>
          <View style={styles.neverList}>
            {NEVER_COLLECTED.map((item) => (
              <View key={item.label} style={styles.neverRow}>
                <View style={[styles.neverIcon, { borderColor: colors.border }]}>
                  <Ionicons name={item.icon} size={15} color={colors.textTertiary} />
                </View>
                <Text variant="body" style={{ flex: 1 }}>
                  {item.label}
                </Text>
                <Ionicons name="close" size={15} color={colors.danger} />
              </View>
            ))}
          </View>
        </Card>

        <Card padding={20}>
          <Text variant="eyebrow">Release privacy</Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            <Text variant="body">
              The production manifest removes the Internet permission, so the app cannot upload
              usage data even by mistake. It also removes Accessibility, screen capture,
              notification listening, and Device Admin permissions.
            </Text>
            <Text variant="body">
              Backup is disabled. Uninstalling PauseLoop deletes the private database with the
              app.
            </Text>
          </View>
        </Card>

        <Text variant="caption" align="center">
          Questions about data? There is no account to contact. Everything is on this device.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.16)',
  },
  stat: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(128,128,128,0.16)',
  },
  metaRows: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.16)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.16)',
  },
  neverList: {
    marginTop: 12,
    gap: 10,
  },
  neverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  neverIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
