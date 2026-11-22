import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Text } from '@/components/text';
import { useTheme } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'quiet' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: IoniconName;
  trailingIcon?: IoniconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  trailingIcon,
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
  accessibilityHint,
}: ButtonProps) {
  const { colors, radii, fonts } = useTheme();
  const isDisabled = disabled || loading;

  const palette = {
    primary: {
      background: colors.accent,
      border: colors.accent,
      foreground: colors.accentInk,
      pressed: colors.accentPressed,
    },
    secondary: {
      background: colors.surfaceStrong,
      border: colors.border,
      foreground: colors.text,
      pressed: colors.surfaceMuted,
    },
    ghost: {
      background: 'transparent',
      border: 'transparent',
      foreground: colors.textSecondary,
      pressed: colors.surfaceMuted,
    },
    quiet: {
      background: colors.accentSoft,
      border: colors.borderStrong,
      foreground: colors.accent,
      pressed: colors.surfaceMuted,
    },
    danger: {
      background: 'transparent',
      border: colors.danger,
      foreground: colors.danger,
      pressed: colors.surfaceMuted,
    },
  }[variant];

  const height = size === 'sm' ? 46 : size === 'lg' ? 60 : 54;
  const horizontalPadding = size === 'sm' ? 16 : 22;
  const iconSize = size === 'sm' ? 16 : 18;
  const gap = size === 'sm' ? 8 : 10;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: height,
          paddingHorizontal: horizontalPadding,
          borderRadius: radii.md,
          backgroundColor: pressed ? palette.pressed : palette.background,
          borderColor: palette.border,
          opacity: isDisabled ? 0.45 : pressed ? 0.94 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.988 : 1 }],
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          gap,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.foreground} size="small" />
      ) : icon ? (
        <Ionicons name={icon} size={iconSize} color={palette.foreground} />
      ) : null}
      <Text
        style={{
          fontFamily: fonts.bold,
          fontSize: size === 'sm' ? 13 : 15,
          color: palette.foreground,
          letterSpacing: -0.1,
          textAlign: 'center',
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
      {trailingIcon ? (
        <View style={styles.trailing}>
          <Ionicons name={trailingIcon} size={iconSize} color={palette.foreground} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  trailing: {
    marginLeft: 'auto',
  },
});
