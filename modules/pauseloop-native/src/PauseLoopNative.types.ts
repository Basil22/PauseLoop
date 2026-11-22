export type PermissionStatus = {
  usageAccess: boolean;
  overlay: boolean;
  notifications: boolean;
  batteryOptimizationIgnored: boolean;
};

export type InstalledApp = {
  packageName: string;
  label: string;
  isSystem: boolean;
};

export type DebugState = {
  serviceRunning: boolean;
  overlayVisible: boolean;
  screenOn: boolean;
  locked: boolean;
  foregroundPackage: string | null;
  foregroundClass: string | null;
};

export type UsageEvent = {
  type: string;
  packageName: string;
  className: string | null;
  timestamp: number;
};

export type OverlayAction = 'close' | 'snooze' | 'dismissed' | 'blocked' | 'failed';

export type OverlayActionEvent = {
  action: OverlayAction;
  packageName?: string;
};

export type MonitoringStateEvent = {
  running: boolean;
};

export type MonitoringSettings = {
  monitoringEnabled: boolean;
  targetPackages: string[];
  reminderIntervalMinutes: number;
  suggestionsEnabled: boolean;
  insightsEnabled: boolean;
  onboardingComplete: boolean;
};

export type HistoryStatus = {
  daysStored: number;
  oldestDate: string | null;
  newestDate: string | null;
  totalMonitoredMs: number;
  retentionDays: number;
};

export type SessionSnapshot = {
  monitoringEnabled: boolean;
  serviceRunning: boolean;
  activeSessionMs: number;
  thresholdMs: number;
  reminderIntervalMinutes: number;
  debugThresholdSeconds: number;
  selectedAppCount: number;
  snoozesRemaining: number;
  snoozeRemainingMs: number;
  cooldownRemainingMs: number;
  overlayMode: string | null;
  foregroundPackage: string | null;
  lastPackage: string | null;
};
