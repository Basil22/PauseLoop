import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type CardProps = PropsWithChildren<{
  variant?: 'default' | 'raised' | 'muted' | 'accent';
  style?: StyleProp<ViewStyle>;
  padding?: number;
}>;

export function Card({ children, variant = 'default', style, padding = 20 }: CardProps) {
  const { colors, radii } = useTheme();

  const variantStyle: ViewStyle =
    variant === 'raised'
      ? { backgroundColor: colors.surfaceStrong, borderColor: colors.borderStrong }
      : variant === 'muted'
        ? { backgroundColor: colors.surfaceMuted, borderColor: colors.border }
        : variant === 'accent'
          ? { backgroundColor: colors.accentSoft, borderColor: colors.borderStrong }
          : { backgroundColor: colors.surface, borderColor: colors.border };

  return (
    <View
      style={[
        styles.card,
        { borderRadius: radii.lg, padding },
        variantStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
