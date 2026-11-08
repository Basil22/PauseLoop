import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import {
  MAX_REMINDER_INTERVAL_MINUTES,
  MIN_REMINDER_INTERVAL_MINUTES,
  clampReminderInterval,
  formatInterval,
} from '@/lib/settings';
import { useTheme } from '@/theme';

type IntervalStepperProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

const PRESETS = [1, 5, 15, 30, 60];

export function IntervalStepper({ value, onChange, disabled = false }: IntervalStepperProps) {
  const { colors, radii, spacing, fonts } = useTheme();
  const safe = clampReminderInterval(value);

  const step = (delta: number) => {
    const next = clampReminderInterval(safe + delta);
    if (next !== safe) onChange(next);
  };

  return (
    <View style={[styles.root, { gap: spacing.sm }]}>
      <View
        style={[
          styles.control,
          {
            borderColor: colors.border,
            backgroundColor: colors.surfaceMuted,
            borderRadius: radii.md,
          },
        ]}
      >
        <Pressable
          onPress={() => step(-1)}
          disabled={disabled || safe <= MIN_REMINDER_INTERVAL_MINUTES}
          accessibilityRole="button"
          accessibilityLabel="Decrease reminder interval by one minute"
          style={({ pressed }) => [
            styles.stepButton,
            {
              borderRadius: radii.sm,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              opacity:
                disabled || safe <= MIN_REMINDER_INTERVAL_MINUTES ? 0.4 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="remove" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.value}>
          <Text
            style={{
              fontFamily: fonts.extrabold,
              fontSize: 28,
              letterSpacing: -0.8,
              color: colors.text,
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
            accessibilityLabel={`${formatInterval(safe)} reminder interval`}
          >
            {formatInterval(safe)}
          </Text>
          <Text variant="caption">between reminders</Text>
        </View>

        <Pressable
          onPress={() => step(1)}
          disabled={disabled || safe >= MAX_REMINDER_INTERVAL_MINUTES}
          accessibilityRole="button"
          accessibilityLabel="Increase reminder interval by one minute"
          style={({ pressed }) => [
            styles.stepButton,
            {
              borderRadius: radii.sm,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              opacity:
                disabled || safe >= MAX_REMINDER_INTERVAL_MINUTES ? 0.4 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="add" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.presets}>
        {PRESETS.map((preset) => {
          const active = safe === preset;
          return (
            <Pressable
              key={preset}
              onPress={() => onChange(preset)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled }}
              accessibilityLabel={`Use ${formatInterval(preset)}`}
              style={({ pressed }) => [
                styles.preset,
                {
                  borderColor: active ? colors.borderStrong : colors.border,
                  backgroundColor: active ? colors.accentSoft : colors.surface,
                  borderRadius: radii.pill,
                  opacity: disabled ? 0.5 : pressed ? 0.72 : 1,
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: fonts.semibold,
                  fontSize: 12,
                  color: active ? colors.accent : colors.textSecondary,
                }}
              >
                {preset === 60 ? '1 hr' : `${preset} min`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    padding: 8,
  },
  stepButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  value: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
    minWidth: 90,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  preset: {
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 7,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
