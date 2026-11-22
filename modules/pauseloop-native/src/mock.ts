import type {
  DebugState,
  HistoryStatus,
  InstalledApp,
  MonitoringSettings,
  PermissionStatus,
  SessionSnapshot,
  UsageEvent,
} from './PauseLoopNative.types';

/**
 * A small in-memory stand-in for the native module. It powers the web preview
 * and keeps the UI explorable in Expo Go, where the custom Kotlin module is not
 * available. It is never used in a real Android development build.
 */
const MOCK_APPS: InstalledApp[] = [
  { packageName: 'com.google.android.youtube', label: 'YouTube', isSystem: false },
  { packageName: 'com.instagram.android', label: 'Instagram', isSystem: false },
  { packageName: 'com.zhiliaoapp.musically', label: 'TikTok', isSystem: false },
  { packageName: 'com.android.chrome', label: 'Chrome', isSystem: false },
  { packageName: 'com.reddit.frontpage', label: 'Reddit', isSystem: false },
  { packageName: 'com.twitter.android', label: 'X', isSystem: false },
  { packageName: 'com.facebook.katana', label: 'Facebook', isSystem: false },
  { packageName: 'com.google.android.apps.photos', label: 'Photos', isSystem: false },
  { packageName: 'com.android.settings', label: 'Settings', isSystem: true },
  { packageName: 'com.google.android.deskclock', label: 'Clock', isSystem: true },
];

const YOUTUBE_HOME = 'com.google.android.apps.youtube.app.watchwhile.MainActivity';
const YOUTUBE_WATCH = 'com.google.android.apps.youtube.app.watchwhile.WatchWhileActivity';
const YOUTUBE_SHORTS = 'com.google.android.apps.youtube.app.watchwhile.ShortsActivity';

const DEFAULT_TARGET_PACKAGES = ['com.google.android.youtube', 'com.instagram.android'];
const RETENTION_DAYS = 90;
const MAX_TARGET_PACKAGES = 250;
const MIN_REMINDER_INTERVAL_MINUTES = 1;
const MAX_REMINDER_INTERVAL_MINUTES = 120;
const DEFAULT_REMINDER_INTERVAL_MINUTES = 5;
const MAX_SNOOZES = 2;

function normalizePackages(packages: string[]): string[] {
  return Array.from(
    new Set(
      packages
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value.length <= 255 && !value.includes('\n')),
    ),
  )
    .sort()
    .slice(0, MAX_TARGET_PACKAGES);
}

function clampReminderInterval(minutes: number): number {
  if (!Number.isFinite(minutes)) return DEFAULT_REMINDER_INTERVAL_MINUTES;
  return Math.min(
    MAX_REMINDER_INTERVAL_MINUTES,
    Math.max(MIN_REMINDER_INTERVAL_MINUTES, Math.round(minutes)),
  );
}

function createUsageEvents(): UsageEvent[] {
  const now = Date.now();
  const base: Omit<UsageEvent, 'timestamp'>[] = [
    { type: 'ACTIVITY_RESUMED', packageName: 'com.google.android.youtube', className: YOUTUBE_HOME },
    { type: 'ACTIVITY_PAUSED', packageName: 'com.google.android.youtube', className: YOUTUBE_HOME },
    { type: 'ACTIVITY_RESUMED', packageName: 'com.google.android.youtube', className: YOUTUBE_WATCH },
    { type: 'ACTIVITY_PAUSED', packageName: 'com.google.android.youtube', className: YOUTUBE_WATCH },
    { type: 'ACTIVITY_RESUMED', packageName: 'com.google.android.youtube', className: YOUTUBE_SHORTS },
    { type: 'ACTIVITY_PAUSED', packageName: 'com.google.android.youtube', className: YOUTUBE_SHORTS },
    { type: 'ACTIVITY_RESUMED', packageName: 'com.google.android.youtube', className: YOUTUBE_HOME },
  ];
  return base.map((event, index) => ({
    ...event,
    timestamp: now - (base.length - index) * 17_000,
  }));
}

export function createMockNativeModule() {
  let permissions: PermissionStatus = {
    usageAccess: true,
    overlay: true,
    notifications: true,
    batteryOptimizationIgnored: false,
  };
  let settings: MonitoringSettings = {
    monitoringEnabled: false,
    targetPackages: [...DEFAULT_TARGET_PACKAGES],
    reminderIntervalMinutes: DEFAULT_REMINDER_INTERVAL_MINUTES,
    suggestionsEnabled: true,
    insightsEnabled: true,
    onboardingComplete: false,
  };
  let history: HistoryStatus = {
    daysStored: 0,
    oldestDate: null,
    newestDate: null,
    totalMonitoredMs: 0,
    retentionDays: RETENTION_DAYS,
  };
  let monitoring = false;
  let overlayVisible = false;
  let sessionStartedAt: number | null = null;
  let accumulatedSessionMs = 0;

  const currentSettings = (): MonitoringSettings => ({
    ...settings,
    targetPackages: [...settings.targetPackages],
  });

  const updateSettings = (patch: Partial<MonitoringSettings>): MonitoringSettings => {
    settings = { ...settings, ...patch };
    return currentSettings();
  };

  const currentActiveSessionMs = (): number =>
    accumulatedSessionMs + (sessionStartedAt === null ? 0 : Date.now() - sessionStartedAt);

  const debugState = (): DebugState => ({
    serviceRunning: monitoring,
    overlayVisible,
    screenOn: true,
    locked: false,
    foregroundPackage: 'com.google.android.youtube',
    foregroundClass: YOUTUBE_SHORTS,
  });

  return {
    async getPermissionStatus(): Promise<PermissionStatus> {
      return { ...permissions };
    },
    async openUsageAccessSettings(): Promise<void> {
      permissions = { ...permissions, usageAccess: true };
    },
    async openOverlaySettings(): Promise<void> {
      permissions = { ...permissions, overlay: true };
    },
    async requestNotificationPermission(): Promise<void> {
      permissions = { ...permissions, notifications: true };
    },
    async openBatteryOptimizationSettings(): Promise<void> {
      permissions = { ...permissions, batteryOptimizationIgnored: true };
    },
    async getInstalledApps(): Promise<InstalledApp[]> {
      return MOCK_APPS.map((app) => ({ ...app }));
    },
    async getAppIcon(): Promise<string | null> {
      return null;
    },
    async startMonitoring(): Promise<void> {
      monitoring = true;
      overlayVisible = false;
      sessionStartedAt = Date.now();
      accumulatedSessionMs = 0;
      settings = { ...settings, monitoringEnabled: true };
    },
    async stopMonitoring(): Promise<void> {
      if (sessionStartedAt !== null) {
        accumulatedSessionMs += Date.now() - sessionStartedAt;
        sessionStartedAt = null;
      }
      monitoring = false;
      overlayVisible = false;
      settings = { ...settings, monitoringEnabled: false };
    },
    async isMonitoring(): Promise<boolean> {
      return monitoring;
    },
    async getSettings(): Promise<MonitoringSettings> {
      return currentSettings();
    },
    async setTargetPackages(packages: string[]): Promise<MonitoringSettings> {
      return updateSettings({ targetPackages: normalizePackages(packages) });
    },
    async setReminderIntervalMinutes(minutes: number): Promise<MonitoringSettings> {
      return updateSettings({ reminderIntervalMinutes: clampReminderInterval(minutes) });
    },
    async setSuggestionsEnabled(enabled: boolean): Promise<MonitoringSettings> {
      return updateSettings({ suggestionsEnabled: enabled });
    },
    async setInsightsEnabled(enabled: boolean): Promise<MonitoringSettings> {
      return updateSettings({ insightsEnabled: enabled });
    },
    async setOnboardingComplete(complete: boolean): Promise<MonitoringSettings> {
      return updateSettings({ onboardingComplete: complete });
    },
    async getHistoryStatus(): Promise<HistoryStatus> {
      return { ...history };
    },
    async clearHistory(): Promise<void> {
      history = {
        daysStored: 0,
        oldestDate: null,
        newestDate: null,
        totalMonitoredMs: 0,
        retentionDays: RETENTION_DAYS,
      };
    },
    async getSessionState(): Promise<SessionSnapshot> {
      return {
        monitoringEnabled: settings.monitoringEnabled,
        serviceRunning: monitoring,
        activeSessionMs: currentActiveSessionMs(),
        thresholdMs: settings.reminderIntervalMinutes * 60_000,
        reminderIntervalMinutes: settings.reminderIntervalMinutes,
        debugThresholdSeconds: 0,
        selectedAppCount: settings.targetPackages.length,
        snoozesRemaining: MAX_SNOOZES,
        snoozeRemainingMs: 0,
        cooldownRemainingMs: 0,
        overlayMode: overlayVisible ? 'reminder' : null,
        foregroundPackage: monitoring ? 'com.google.android.youtube' : null,
        lastPackage: monitoring ? 'com.google.android.youtube' : null,
      };
    },
    async showTestOverlay(): Promise<void> {
      overlayVisible = true;
    },
    async hideOverlay(): Promise<void> {
      overlayVisible = false;
    },
    async getDebugState(): Promise<DebugState> {
      return debugState();
    },
    async getRecentUsageEvents(packageName: string, limit: number): Promise<UsageEvent[]> {
      return createUsageEvents()
        .filter((event) => event.packageName === packageName)
        .slice(-Math.min(Math.max(limit, 1), 100));
    },
  };
}
