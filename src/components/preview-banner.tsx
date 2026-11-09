import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { useTheme } from '@/theme';

type PreviewBannerProps = {
  message?: string;
};

export function PreviewBanner({ message }: PreviewBannerProps) {
  const { colors, radii, spacing } = useTheme();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: 'rgba(247, 212, 136, 0.08)',
          borderColor: 'rgba(247, 212, 136, 0.24)',
          borderRadius: radii.md,
          padding: spacing.md,
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: 'rgba(247, 212, 136, 0.12)' }]}>
        <Ionicons name="flask-outline" size={18} color={colors.warning} />
      </View>
      <View style={styles.copy}>
        <Text
          style={{
            fontFamily: 'Manrope_700Bold',
            fontSize: 13,
            color: colors.warning,
          }}
        >
          Preview mode
        </Text>
        <Text variant="caption">
          {message ??
            'Native Android features are simulated here. Install a development build to test permissions, the overlay, and the foreground service for real.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
});
