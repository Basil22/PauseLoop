import type { MonitoringSettings } from '@native/index';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';

import { errorMessage } from '@/lib/format';
import { native } from '@/lib/native';
import { normalizePackages } from '@/lib/settings';

type SettingsAction =
  | 'targets'
  | 'interval'
  | 'suggestions'
  | 'insights'
  | 'onboarding'
  | null;

type AppSettingsContextValue = {
  settings: MonitoringSettings | null;
  selectedPackages: Set<string>;
  loading: boolean;
  refreshing: boolean;
  savingAction: SettingsAction;
  error: string | null;
  refresh: () => Promise<MonitoringSettings | null>;
  saveTargetPackages: (packages: string[]) => Promise<boolean>;
  saveReminderInterval: (minutes: number) => Promise<boolean>;
  saveSuggestions: (enabled: boolean) => Promise<boolean>;
  saveInsights: (enabled: boolean) => Promise<boolean>;
  completeOnboarding: () => Promise<boolean>;
  clearError: () => void;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<MonitoringSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingAction, setSavingAction] = useState<SettingsAction>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await native.getSettings();
      if (mounted.current) {
        setSettings(next);
        setError(null);
      }
      return next;
    } catch (caught) {
      if (mounted.current) {
        setError(errorMessage(caught));
      }
      return null;
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      }
    });

    return () => {
      mounted.current = false;
      subscription.remove();
    };
  }, [refresh]);

  const runUpdate = useCallback(
    async (
      action: Exclude<SettingsAction, null>,
      operation: () => Promise<MonitoringSettings>,
    ) => {
      setSavingAction(action);
      setError(null);
      try {
        const next = await operation();
        if (mounted.current) {
          setSettings(next);
        }
        return true;
      } catch (caught) {
        if (mounted.current) {
          setError(errorMessage(caught));
        }
        return false;
      } finally {
        if (mounted.current) {
          setSavingAction(null);
        }
      }
    },
    [],
  );

  const saveTargetPackages = useCallback(
    (packages: string[]) =>
      runUpdate('targets', () => native.setTargetPackages(normalizePackages(packages))),
    [runUpdate],
  );

  const saveReminderInterval = useCallback(
    (minutes: number) => runUpdate('interval', () => native.setReminderIntervalMinutes(minutes)),
    [runUpdate],
  );

  const saveSuggestions = useCallback(
    (enabled: boolean) => runUpdate('suggestions', () => native.setSuggestionsEnabled(enabled)),
    [runUpdate],
  );

  const saveInsights = useCallback(
    (enabled: boolean) => runUpdate('insights', () => native.setInsightsEnabled(enabled)),
    [runUpdate],
  );

  const completeOnboarding = useCallback(
    () => runUpdate('onboarding', () => native.setOnboardingComplete(true)),
    [runUpdate],
  );

  const clearError = useCallback(() => setError(null), []);

  const selectedPackages = useMemo(
    () => new Set(settings?.targetPackages ?? []),
    [settings?.targetPackages],
  );

  const value = useMemo<AppSettingsContextValue>(
    () => ({
      settings,
      selectedPackages,
      loading,
      refreshing,
      savingAction,
      error,
      refresh,
      saveTargetPackages,
      saveReminderInterval,
      saveSuggestions,
      saveInsights,
      completeOnboarding,
      clearError,
    }),
    [
      settings,
      selectedPackages,
      loading,
      refreshing,
      savingAction,
      error,
      refresh,
      saveTargetPackages,
      saveReminderInterval,
      saveSuggestions,
      saveInsights,
      completeOnboarding,
      clearError,
    ],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings(): AppSettingsContextValue {
  const value = useContext(AppSettingsContext);
  if (!value) {
    throw new Error('useAppSettings must be used inside AppSettingsProvider');
  }
  return value;
}
