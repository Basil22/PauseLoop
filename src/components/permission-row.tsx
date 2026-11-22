import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { StatusPill } from '@/components/status-pill';
import { Text } from '@/components/text';
import { useTheme } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type PermissionRowProps = {
  icon: IoniconName;
  title: string;
  description: string;
  granted: boolean;
  actionLabel: string;
  onPress: () => void;
  busy?: boolean;
  last?: boolean;
  optional?: boolean;
};

export function PermissionRow({
  icon,
  title,
  description,
  granted,
  actionLabel,
  onPress,
  busy = false,
  last = false,
  optional = false,
}: PermissionRowProps) {
  const { colors, fonts, spacing, radii } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${granted ? 'Granted' : actionLabel}`}
      accessibilityHint={description}
      style={({ pressed }) => [
        styles.row,
        {
          paddingVertical: spacing.md,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.border,
          opacity: pressed ? 0.72 : busy ? 0.6 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconTile,
          {
            borderRadius: radii.md,
            backgroundColor: granted ? colors.accentSoft : colors.surfaceMuted,
            borderColor: granted ? colors.borderStrong : colors.border,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={granted ? colors.accent : colors.textTertiary}
        />
      </View>

      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text
            style={{
              fontFamily: fonts.semibold,
              fontSize: 15,
              color: colors.text,
              flexShrink: 1,
            }}
          >
            {title}
          </Text>
          <StatusPill
            label={granted ? (optional ? 'Ready' : 'Granted') : actionLabel}
            tone={granted ? 'success' : optional ? 'neutral' : 'warning'}
          />
        </View>
        <Text variant="caption" style={{ marginTop: 2 }}>
          {description}
        </Text>
      </View>

      {busy ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    minHeight: 70,
  },
  iconTile: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
});
