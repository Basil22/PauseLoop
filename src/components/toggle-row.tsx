import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/text';
import { useTheme } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type ToggleRowProps = {
  icon: IoniconName;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  last?: boolean;
};

export function ToggleRow({
  icon,
  title,
  description,
  value,
  onValueChange,
  disabled = false,
  loading = false,
  last = false,
}: ToggleRowProps) {
  const { colors, radii, spacing } = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          paddingVertical: spacing.md,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.border,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.icon,
          {
            borderRadius: radii.md,
            borderColor: value ? colors.borderStrong : colors.border,
            backgroundColor: value ? colors.accentSoft : colors.surfaceMuted,
          },
        ]}
      >
        <Ionicons name={icon} size={19} color={value ? colors.accent : colors.textTertiary} />
      </View>

      <View style={styles.copy}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption">{description}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          accessibilityLabel={title}
          accessibilityHint={description}
          trackColor={{ false: colors.surfaceMuted, true: colors.accentSoft }}
          thumbColor={value ? colors.accent : colors.textTertiary}
          ios_backgroundColor={colors.surfaceMuted}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
  },
  icon: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
});
