import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

type LiveDotProps = {
  active?: boolean;
  size?: number;
};

export function LiveDot({ active = true, size = 8 }: LiveDotProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: active ? colors.success : colors.textTertiary,
        },
      ]}
    >
      {active ? (
        <View
          style={[
            styles.halo,
            {
              width: size * 2.2,
              height: size * 2.2,
              borderRadius: size * 1.1,
              backgroundColor: colors.success,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    opacity: 0.14,
  },
});
