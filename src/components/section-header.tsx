import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { useTheme } from '@/theme';

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  trailing?: ReactNode;
};

export function SectionHeader({ eyebrow, title, description, trailing }: SectionHeaderProps) {
  const { spacing } = useTheme();

  return (
    <View style={[styles.root, { gap: spacing.xs }]}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          {eyebrow ? <Text variant="eyebrow">{eyebrow}</Text> : null}
          <Text variant="heading">{title}</Text>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
});
