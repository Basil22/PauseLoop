import { Image, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

type BrandMarkProps = {
  size?: number;
  framed?: boolean;
};

export function BrandMark({ size = 40, framed = true }: BrandMarkProps) {
  const { colors, radii } = useTheme();
  const frameSize = size + 12;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="PauseLoop"
      style={[
        styles.frame,
        framed
          ? {
              width: frameSize,
              height: frameSize,
              borderRadius: radii.md,
              backgroundColor: colors.accentSoft,
              borderColor: colors.borderStrong,
            }
          : null,
      ]}
    >
      <Image
        source={require('../../assets/images/android-icon-foreground.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
});
