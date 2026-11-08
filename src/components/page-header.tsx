import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { useTheme } from '@/theme';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  trailing?: ReactNode;
  onBack?: () => void;
};

export function PageHeader({ eyebrow, title, description, trailing, onBack }: PageHeaderProps) {
  const router = useRouter();
  const { colors, radii, spacing } = useTheme();

  const goBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={[styles.root, { gap: spacing.sm }]}>
      <View style={styles.row}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [
            styles.back,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="arrow-back" size={21} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.copy}>
          {eyebrow ? <Text variant="eyebrow">{eyebrow}</Text> : null}
          <Text variant="title">{title}</Text>
        </View>
        {trailing}
      </View>
      {description ? <Text variant="body">{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    width: 46,
    height: 46,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    gap: 1,
  },
});
