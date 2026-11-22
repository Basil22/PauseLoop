import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
}>;

export function Screen({ children, scroll = true, contentStyle, footer }: ScreenProps) {
  const { colors, layout } = useTheme();
  const insets = useSafeAreaInsets();

  const padding = {
    paddingTop: insets.top + 18,
    paddingBottom: insets.bottom + layout.contentBottom,
    paddingHorizontal: layout.gutter,
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.backgroundRaised, colors.background, colors.background]}
        locations={[0, 0.46, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[styles.glow, styles.glowTop, { backgroundColor: colors.accentSoft }]}
      />
      <View
        pointerEvents="none"
        style={[styles.glow, styles.glowBottom, { borderColor: colors.border }]}
      />

      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            padding,
            { maxWidth: layout.maxWidth },
            contentStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
          {footer}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, padding, { maxWidth: layout.maxWidth }]}>
          {children}
          {footer}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    width: '100%',
    alignSelf: 'center',
  },
  fill: {
    flex: 1,
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowTop: {
    width: 360,
    height: 360,
    top: -210,
    right: -150,
    opacity: 0.9,
  },
  glowBottom: {
    width: 280,
    height: 280,
    bottom: -190,
    left: -150,
    borderWidth: 1,
    opacity: 0.45,
  },
});
