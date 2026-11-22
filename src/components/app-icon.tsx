import { Image, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { useAppIcon } from '@/hooks/use-app-icon';
import { useTheme } from '@/theme';

type AppIconProps = {
  packageName: string;
  label: string;
  size?: number;
};

const monogramColors = [
  ['#1E3A2F', '#9BE8A8'],
  ['#2B3320', '#C8F169'],
  ['#1F3038', '#7DE3C3'],
  ['#352B22', '#F7D488'],
  ['#32252A', '#FF9A8B'],
  ['#272A38', '#B9C6FF'],
] as const;

function colorFor(packageName: string) {
  let hash = 0;
  for (let i = 0; i < packageName.length; i += 1) {
    hash = (hash * 31 + packageName.charCodeAt(i)) >>> 0;
  }
  return monogramColors[hash % monogramColors.length] ?? monogramColors[0];
}

export function AppIcon({ packageName, label, size = 42 }: AppIconProps) {
  const { icon } = useAppIcon(packageName);
  const { colors, radii } = useTheme();
  const [background, foreground] = colorFor(packageName);

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: Math.max(10, radii.sm + 2),
          backgroundColor: background,
          borderColor: colors.border,
        },
      ]}
    >
      {icon ? (
        <Image source={{ uri: icon }} style={{ width: size * 0.72, height: size * 0.72 }} />
      ) : (
        <Text
          style={{
            fontFamily: 'Manrope_800ExtraBold',
            fontSize: size * 0.38,
            color: foreground,
          }}
        >
          {label.trim().slice(0, 1).toUpperCase() || '?'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
});
