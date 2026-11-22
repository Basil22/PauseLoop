import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { StatusPill } from '@/components/status-pill';
import { Text } from '@/components/text';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const PRIVACY_POINTS: { icon: IoniconName; title: string; body: string }[] = [
  {
    icon: 'phone-portrait-outline',
    title: 'Everything stays here',
    body: 'Usage totals live in the app’s private storage. No account, no cloud, no upload.',
  },
  {
    icon: 'eye-off-outline',
    title: 'We cannot see content',
    body: 'PauseLoop reads only which selected app is in front. Never messages, video titles, or your screen.',
  },
  {
    icon: 'hand-left-outline',
    title: 'You stay in control',
    body: 'Home and notifications always work. The pause is friction, not a lock.',
  },
];

function createStyles(theme: Theme) {
  const { colors, spacing, radii } = theme;
  return StyleSheet.create({
    stack: {
      gap: spacing.xl,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      flexShrink: 1,
      minWidth: 0,
    },
    brandCopy: {
      gap: 1,
      flexShrink: 1,
      minWidth: 0,
    },
    wordmark: {
      fontFamily: theme.fonts.extrabold,
      fontSize: 17,
      letterSpacing: -0.3,
      color: colors.text,
    },
    hero: {
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    accent: {
      color: colors.accent,
    },
    points: {
      gap: 10,
    },
    point: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    pointIcon: {
      width: 38,
      height: 38,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    pointCopy: {
      flex: 1,
      gap: 2,
    },
    flowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    flow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: spacing.md,
    },
    step: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.pill,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    stepNumber: {
      width: 18,
      height: 18,
      borderRadius: 999,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumberText: {
      fontFamily: theme.fonts.bold,
      fontSize: 10,
      color: colors.accent,
    },
    footer: {
      gap: spacing.sm,
    },
    finePrint: {
      textAlign: 'center',
    },
  });
}

export default function OnboardingWelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Screen>
      <View style={styles.stack}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <BrandMark size={34} />
            <View style={styles.brandCopy}>
              <Text style={styles.wordmark}>PauseLoop</Text>
              <Text variant="caption">Private digital wellbeing</Text>
            </View>
          </View>
          <StatusPill label="Step 1 of 3" tone="accent" />
        </View>

        <View style={styles.hero}>
          <Text variant="eyebrow" tone="secondary">
            Welcome · Android
          </Text>
          <Text variant="display">Break the loop.</Text>
          <Text variant="display" style={styles.accent}>
            Take the pause.
          </Text>
          <Text variant="body">
            Choose the apps that tend to pull you in. When you have been scrolling for a while,
            PauseLoop covers the screen with one calm, full-screen pause.
          </Text>
        </View>

        <View style={styles.points}>
          {PRIVACY_POINTS.map((point) => (
            <View key={point.title} style={styles.point}>
              <View style={styles.pointIcon}>
                <Ionicons name={point.icon} size={18} color={theme.colors.mint} />
              </View>
              <View style={styles.pointCopy}>
                <Text variant="bodyStrong">{point.title}</Text>
                <Text variant="caption">{point.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <Card variant="accent" padding={20}>
          <View style={styles.flowHeader}>
            <Text variant="eyebrow" tone="accent">
              Three short steps
            </Text>
            <StatusPill label="No account" tone="neutral" dot={false} />
          </View>
          <View style={styles.flow}>
            {['Pick your apps', 'Grant permissions', 'Start the pause'].map((label, index) => (
              <View key={label} style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text variant="label" tone="secondary">
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <View style={styles.footer}>
          <Button
            label="Choose your apps"
            icon="apps-outline"
            trailingIcon="arrow-forward"
            onPress={() => router.push('/onboarding/apps')}
          />
          <Text variant="caption" style={styles.finePrint}>
            You can change everything later in Settings. Nothing leaves this phone.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
