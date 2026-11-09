import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

type StatusOrbProps = {
  active: boolean;
  size?: number;
};

export function StatusOrb({ active, size = 96 }: StatusOrbProps) {
  const { colors, isDark } = useTheme();
  const inner = size * 0.68;
  const core = size * 0.46;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: active ? colors.accentSoft : isDark ? colors.surfaceMuted : colors.backgroundRaised,
          borderColor: active ? colors.borderStrong : colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.middle,
          {
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            borderColor: active ? colors.borderStrong : colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.core,
            {
              width: core,
              height: core,
              borderRadius: core / 2,
              backgroundColor: active ? colors.accent : colors.surfaceStrong,
              borderColor: active ? colors.accent : colors.border,
              gap: Math.max(3, size * 0.035),
            },
          ]}
        >
          <View
            style={[
              styles.bar,
              {
                width: Math.max(3, size * 0.055),
                height: Math.max(10, size * 0.18),
                backgroundColor: active ? colors.accentInk : colors.textTertiary,
              },
            ]}
          />
          <View
            style={[
              styles.bar,
              {
                width: Math.max(3, size * 0.055),
                height: Math.max(10, size * 0.18),
                backgroundColor: active ? colors.accentInk : colors.textTertiary,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  middle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  core: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  bar: {
    borderRadius: 999,
  },
});
