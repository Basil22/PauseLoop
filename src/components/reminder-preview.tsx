import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { useTheme } from '@/theme';

type ReminderPreviewProps = {
  visible: boolean;
  appName?: string;
  snoozesLeft?: number;
  onClose: () => void;
};

export function ReminderPreview({
  visible,
  appName = 'YouTube',
  snoozesLeft = 2,
  onClose,
}: ReminderPreviewProps) {
  const insets = useSafeAreaInsets();
  const { colors, radii, spacing } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.overlayBottom }]}>
        <View style={[styles.top, { paddingTop: insets.top + 18 }]}>
          <View style={styles.brandRow}>
            <View
              style={[
                styles.brandDot,
                { backgroundColor: colors.accent, borderRadius: radii.pill },
              ]}
            />
            <Text
              style={{
                fontFamily: 'Manrope_800ExtraBold',
                fontSize: 12,
                letterSpacing: 2.2,
                color: colors.textSecondary,
              }}
            >
              PAUSELOOP
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close preview"
            hitSlop={12}
            style={[styles.close, { borderColor: colors.border, borderRadius: radii.pill }]}
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 28, paddingHorizontal: spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderStrong,
                borderRadius: radii.xxl,
                padding: spacing.xl,
              },
            ]}
          >
            <View style={[styles.pauseMark, { backgroundColor: colors.accent }]}>
              <View style={[styles.bar, { backgroundColor: colors.accentInk }]} />
              <View style={[styles.bar, { backgroundColor: colors.accentInk }]} />
            </View>

            <Text variant="eyebrow" align="center" style={{ color: colors.accent }}>
              A mindful pause
            </Text>
            <Text variant="title" align="center" style={{ marginTop: 6 }}>
              Break the loop.{'\n'}Take the pause.
            </Text>
            <Text variant="body" align="center" style={{ marginTop: 10 }}>
              You have been scrolling in {appName} for a while. Take a breath, then choose what
              comes next.
            </Text>

            <View
              style={[
                styles.suggestion,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  marginTop: spacing.lg,
                },
              ]}
            >
              <Ionicons name="leaf-outline" size={18} color={colors.mint} />
              <Text variant="caption" style={{ flex: 1 }}>
                Try this: stand up, look away from the screen, and take five slow breaths.
              </Text>
            </View>

            <View style={{ gap: 10, marginTop: spacing.xl }}>
              <Button label="Close app" icon="home-outline" onPress={onClose} />
              {snoozesLeft > 0 ? (
                <Button
                  label={`Snooze 5 min · ${snoozesLeft} left`}
                  variant="secondary"
                  icon="time-outline"
                  onPress={onClose}
                />
              ) : null}
            </View>
          </View>

          <Text variant="caption" align="center" style={{ marginTop: 18 }}>
            This is a React Native preview of the native Android reminder. Back is consumed in the
            real overlay; Home and notifications remain available.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandDot: {
    width: 9,
    height: 9,
  },
  close: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderWidth: 1,
    alignItems: 'center',
  },
  pauseMark: {
    width: 62,
    height: 62,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 18,
  },
  bar: {
    width: 7,
    height: 24,
    borderRadius: 4,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    borderWidth: 1,
    width: '100%',
  },
});
