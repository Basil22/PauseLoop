import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { useTheme } from '@/theme';

type MetricProps = {
  value: string;
  label: string;
  tone?: 'default' | 'accent' | 'warning' | 'danger';
};

export function Metric({ value, label, tone = 'default' }: MetricProps) {
  const { colors, fonts } = useTheme();
  const color = {
    default: colors.text,
    accent: colors.accent,
    warning: colors.warning,
    danger: colors.danger,
  }[tone];

  return (
    <View style={styles.root}>
      <Text
        style={{
          fontFamily: fonts.extrabold,
          fontSize: 26,
          letterSpacing: -1,
          color,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text variant="caption" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minWidth: 78,
    gap: 1,
  },
});
