import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { Notice } from '@/components/notice';
import { StatusPill } from '@/components/status-pill';
import { Text } from '@/components/text';
import { useInstalledApps } from '@/hooks/use-diagnostics';
import { isSuggestedPackage, matchesAppQuery } from '@/lib/settings';
import { useTheme } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type AppPickerProps = {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  search: string;
  onSearchChange: (value: string) => void;
};

export function AppPicker({ selected, onChange, search, onSearchChange }: AppPickerProps) {
  const { apps, loading, error, refresh } = useInstalledApps();
  const { colors, radii, spacing } = useTheme();

  const suggested = apps.filter((app) => isSuggestedPackage(app.packageName, app.label));
  const visible = apps.filter((app) => matchesAppQuery(app, search));
  const suggestedVisible = visible.filter((app) => isSuggestedPackage(app.packageName, app.label));
  const otherVisible = visible.filter((app) => !isSuggestedPackage(app.packageName, app.label));
  const suggestedSelected = suggested.filter((app) => selected.has(app.packageName));

  const toggle = (packageName: string) => {
    const next = new Set(selected);
    if (next.has(packageName)) {
      next.delete(packageName);
    } else {
      next.add(packageName);
    }
    onChange(next);
  };

  const selectSuggested = () => {
    const next = new Set(selected);
    suggested.forEach((app) => next.add(app.packageName));
    onChange(next);
  };

  return (
    <View style={[styles.root, { gap: spacing.md }]}>
      <View
        style={[
          styles.search,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.md,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <SearchInput value={search} onChangeText={onSearchChange} />
        {search.length > 0 ? (
          <Pressable
            onPress={() => onSearchChange('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={10}
          >
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {error ? <Notice message={error} tone="danger" /> : null}

      <View style={styles.summaryRow}>
        <Text variant="caption">
          {loading ? 'Reading launchable apps…' : `${apps.length} launchable apps found`}
        </Text>
        {selected.size > 0 ? (
          <StatusPill label={`${selected.size} selected`} tone="accent" />
        ) : (
          <StatusPill label="Choose at least one" tone="neutral" />
        )}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text variant="caption">Loading the app list without QUERY_ALL_PACKAGES…</Text>
        </View>
      ) : null}

      {!loading && apps.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="apps-outline" size={26} color={colors.textTertiary} />
          <Text variant="bodyStrong" align="center">
            No launchable apps returned
          </Text>
          <Text variant="caption" align="center">
            Check package visibility on the device, then reload.
          </Text>
          <Pressable
            onPress={() => void refresh()}
            accessibilityRole="button"
            accessibilityLabel="Reload apps"
            style={({ pressed }) => [
              styles.reload,
              {
                borderColor: colors.border,
                borderRadius: radii.pill,
                backgroundColor: colors.surfaceMuted,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="refresh" size={14} color={colors.textSecondary} />
            <Text variant="label" tone="secondary">
              Reload apps
            </Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && suggestedVisible.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="eyebrow">Suggested loops</Text>
            {suggestedSelected.length < suggested.length ? (
              <Pressable
                onPress={selectSuggested}
                accessibilityRole="button"
                accessibilityLabel="Select all suggested apps"
                hitSlop={8}
              >
                <Text variant="label" tone="accent">
                  Select all
                </Text>
              </Pressable>
            ) : null}
          </View>
          <View
            style={[
              styles.list,
              {
                borderColor: colors.border,
                borderRadius: radii.lg,
                backgroundColor: colors.surface,
              },
            ]}
          >
            {suggestedVisible.map((app, index) => (
              <AppPickerRow
                key={app.packageName}
                app={app}
                selected={selected.has(app.packageName)}
                onToggle={() => toggle(app.packageName)}
                last={index === suggestedVisible.length - 1}
                suggested
              />
            ))}
          </View>
        </View>
      ) : null}

      {!loading && otherVisible.length > 0 ? (
        <View style={styles.section}>
          <Text variant="eyebrow">
            {search.length > 0 ? 'Search results' : 'All other apps'}
          </Text>
          <View
            style={[
              styles.list,
              {
                borderColor: colors.border,
                borderRadius: radii.lg,
                backgroundColor: colors.surface,
              },
            ]}
          >
            {otherVisible.map((app, index) => (
              <AppPickerRow
                key={app.packageName}
                app={app}
                selected={selected.has(app.packageName)}
                onToggle={() => toggle(app.packageName)}
                last={index === otherVisible.length - 1}
              />
            ))}
          </View>
        </View>
      ) : null}

      {!loading && visible.length === 0 && search.length > 0 ? (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={26} color={colors.textTertiary} />
          <Text variant="bodyStrong" align="center">
            No apps match “{search}”
          </Text>
          <Text variant="caption" align="center">
            Search uses app names and package names only.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function AppPickerRow({
  app,
  selected,
  onToggle,
  last,
  suggested = false,
}: {
  app: { packageName: string; label: string; isSystem: boolean };
  selected: boolean;
  onToggle: () => void;
  last: boolean;
  suggested?: boolean;
}) {
  const { colors, radii } = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${app.label}${suggested ? ', suggested app' : ''}`}
      accessibilityHint={
        selected ? 'Double tap to remove from your loop list' : 'Double tap to add to your loop list'
      }
      style={({ pressed }) => [
        styles.appRow,
        {
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.border,
          backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
        },
      ]}
    >
      <AppIcon packageName={app.packageName} label={app.label} size={42} />
      <View style={styles.appCopy}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {app.label}
        </Text>
        <Text variant="monoSmall" numberOfLines={1}>
          {app.packageName}
        </Text>
      </View>
      <View
        style={[
          styles.check,
          {
            borderRadius: radii.sm,
            borderColor: selected ? colors.accent : colors.border,
            backgroundColor: selected ? colors.accent : 'transparent',
          },
        ]}
      >
        {selected ? <Ionicons name="checkmark" size={16} color={colors.accentInk} /> : null}
      </View>
    </Pressable>
  );
}

/**
 * TextInput is kept behind a tiny wrapper so the search field can use the app
 * font. The wrapper is deliberately local to avoid adding another dependency.
 */
function SearchInput({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  const { colors, fonts } = useTheme();

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="Search installed apps"
      placeholderTextColor={colors.textTertiary}
      accessibilityLabel="Search installed apps"
      autoCorrect={false}
      autoCapitalize="none"
      returnKeyType="search"
      style={{
        flex: 1,
        color: colors.text,
        fontFamily: fonts.regular,
        fontSize: 15,
        paddingVertical: 2,
        minHeight: 24,
      }}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  loading: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 32,
  },
  empty: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  reload: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 6,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  list: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 68,
  },
  appCopy: {
    flex: 1,
    gap: 2,
  },
  check: {
    width: 26,
    height: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
