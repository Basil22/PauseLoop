import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { useTheme } from '@/theme';

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'accent';

type StatusPillProps = {
  label: string;
  tone?: StatusTone;
  dot?: boolean;
};

export function StatusPill({ label, tone = 'neutral', dot = true }: StatusPillProps) {
  const { colors, radii } = useTheme();

  const toneColor = {
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    neutral: colors.textTertiary,
    accent: colors.accent,
  }[tone];

  const background = {
    success: 'rgba(155, 232, 168, 0.10)',
    warning: 'rgba(247, 212, 136, 0.10)',
    danger: 'rgba(255, 154, 139, 0.10)',
    neutral: colors.surfaceMuted,
    accent: colors.accentSoft,
  }[tone];

  return (
    <View
      style={[styles.pill, { backgroundColor: background, borderRadius: radii.pill }]}
      accessibilityLabel={label}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: toneColor }]} /> : null}
      <Text
        style={[styles.label, { color: toneColor }]}
        maxFontSizeMultiplier={1.6}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  label: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
