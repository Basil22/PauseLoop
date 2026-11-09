import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { useTheme } from '@/theme';

type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

type NoticeProps = {
  message: string;
  tone?: NoticeTone;
  onDismiss?: () => void;
};

export function Notice({ message, tone = 'info', onDismiss }: NoticeProps) {
  const { colors, radii, spacing } = useTheme();

  const palette = {
    info: { color: colors.mint, background: 'rgba(125, 227, 195, 0.08)', border: 'rgba(125, 227, 195, 0.22)', icon: 'information-circle-outline' as const },
    success: { color: colors.success, background: 'rgba(155, 232, 168, 0.08)', border: 'rgba(155, 232, 168, 0.22)', icon: 'checkmark-circle-outline' as const },
    warning: { color: colors.warning, background: 'rgba(247, 212, 136, 0.08)', border: 'rgba(247, 212, 136, 0.24)', icon: 'alert-circle-outline' as const },
    danger: { color: colors.danger, background: 'rgba(255, 154, 139, 0.08)', border: 'rgba(255, 154, 139, 0.24)', icon: 'warning-outline' as const },
  }[tone];

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderRadius: radii.md,
          padding: spacing.md,
        },
      ]}
      accessibilityRole={tone === 'danger' || tone === 'warning' ? 'alert' : 'text'}
    >
      <Ionicons name={palette.icon} size={18} color={palette.color} />
      <Text variant="caption" style={{ flex: 1, color: palette.color }}>
        {message}
      </Text>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss message"
          hitSlop={10}
        >
          <Ionicons name="close" size={17} color={palette.color} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
  },
});
