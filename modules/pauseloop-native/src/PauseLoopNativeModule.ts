import { requireNativeModule, type EventEmitter } from 'expo';

import { createMockNativeModule } from './mock';
import type {
  DebugState,
  HistoryStatus,
  InstalledApp,
  MonitoringSettings,
  MonitoringStateEvent,
  OverlayActionEvent,
  PermissionStatus,
  SessionSnapshot,
  UsageEvent,
} from './PauseLoopNative.types';

export type PauseLoopNativeEvents = {
  onOverlayAction: (event: OverlayActionEvent) => void;
  onMonitoringStateChanged: (event: MonitoringStateEvent) => void;
};

export interface PauseLoopNativeModule extends EventEmitter<PauseLoopNativeEvents> {
  getPermissionStatus(): Promise<PermissionStatus>;
  openUsageAccessSettings(): Promise<void>;
  openOverlaySettings(): Promise<void>;
  requestNotificationPermission(): Promise<void>;
  openBatteryOptimizationSettings(): Promise<void>;

  getInstalledApps(): Promise<InstalledApp[]>;
  getAppIcon(packageName: string): Promise<string | null>;

  startMonitoring(): Promise<void>;
  stopMonitoring(): Promise<void>;
  isMonitoring(): Promise<boolean>;

  getSettings(): Promise<MonitoringSettings>;
  setTargetPackages(packages: string[]): Promise<MonitoringSettings>;
  setReminderIntervalMinutes(minutes: number): Promise<MonitoringSettings>;
  setSuggestionsEnabled(enabled: boolean): Promise<MonitoringSettings>;
  setInsightsEnabled(enabled: boolean): Promise<MonitoringSettings>;
  setOnboardingComplete(complete: boolean): Promise<MonitoringSettings>;

  getHistoryStatus(): Promise<HistoryStatus>;
  clearHistory(): Promise<void>;

  getSessionState(): Promise<SessionSnapshot>;

  showTestOverlay(delayMs?: number): Promise<void>;
  hideOverlay(): Promise<void>;

  getDebugState(): Promise<DebugState>;
  getRecentUsageEvents(packageName: string, limit: number): Promise<UsageEvent[]>;
}

let nativeModule: PauseLoopNativeModule | null = null;
let unavailableReason = '';

try {
  nativeModule = requireNativeModule<PauseLoopNativeModule>('PauseLoopNative');
} catch {
  unavailableReason =
    'The PauseLoop native module is not linked in this runtime. Use an EAS development build for real Android monitoring.';
}

export const isNativeAvailable = nativeModule !== null;
export const nativeUnavailableReason = unavailableReason;

export default (nativeModule ??
  (createMockNativeModule() as unknown as PauseLoopNativeModule));
