import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

type ProgressBarProps = {
  value: number;
  tone?: 'accent' | 'mint' | 'warning';
  label?: string;
};

export function ProgressBar({ value, tone = 'accent', label }: ProgressBarProps) {
  const { colors, radii } = useTheme();
  const safe = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const color = {
    accent: colors.accent,
    mint: colors.mint,
    warning: colors.warning,
  }[tone];

  return (
    <View
      style={[styles.track, { backgroundColor: colors.surfaceMuted, borderRadius: radii.pill }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(safe * 100) }}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${safe * 100}%`,
            backgroundColor: color,
            borderRadius: radii.pill,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    height: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
