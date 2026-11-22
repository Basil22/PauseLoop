import type { MonitoringSettings } from '@native/index';

export const MIN_REMINDER_INTERVAL_MINUTES = 1;
export const MAX_REMINDER_INTERVAL_MINUTES = 120;
export const DEFAULT_REMINDER_INTERVAL_MINUTES = 5;
export const MAX_TARGET_PACKAGES = 250;

/**
 * These are deliberately broad package checks rather than a hard-coded list of
 * one device's apps. A suggestion appears only when the package is actually
 * installed.
 */
export const SUGGESTED_PACKAGES = [
  'com.google.android.youtube',
  'com.instagram.android',
  'com.zhiliaoapp.musically',
  'com.ss.android.ugc.trill',
  'com.reddit.frontpage',
  'com.twitter.android',
  'com.facebook.katana',
  'com.snapchat.android',
  'com.pinterest',
  'com.threads',
  'tv.twitch.android.app',
] as const;

const SUGGESTED_NAMES = [
  'youtube',
  'instagram',
  'tiktok',
  'reddit',
  'twitter',
  'facebook',
  'snapchat',
  'pinterest',
  'threads',
  'twitch',
  'shorts',
  'reels',
];

export function clampReminderInterval(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_REMINDER_INTERVAL_MINUTES;
  return Math.min(
    MAX_REMINDER_INTERVAL_MINUTES,
    Math.max(MIN_REMINDER_INTERVAL_MINUTES, Math.round(value)),
  );
}

/** Mirrors MonitoringSettings.normalizePackages on the Kotlin side. */
export function normalizePackages(packages: Iterable<string>): string[] {
  return Array.from(packages)
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value.length <= 255 && !value.includes('\n'))
    .filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, MAX_TARGET_PACKAGES)
    .sort();
}

export function isOnboardingComplete(settings: MonitoringSettings | null): boolean {
  return Boolean(settings?.onboardingComplete);
}

export function isSuggestedPackage(packageName: string, label: string): boolean {
  if ((SUGGESTED_PACKAGES as readonly string[]).includes(packageName)) return true;
  const normalized = label.toLowerCase();
  return SUGGESTED_NAMES.some((name) => normalized.includes(name));
}

export function matchesAppQuery(
  app: { packageName: string; label: string },
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return true;
  return (
    app.label.toLowerCase().includes(normalized) ||
    app.packageName.toLowerCase().includes(normalized)
  );
}

export function formatInterval(minutes: number): string {
  const safe = clampReminderInterval(minutes);
  if (safe < 60) return `${safe} min`;
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export function formatLongDuration(milliseconds: number): string {
  const totalMinutes = Math.max(0, Math.round(milliseconds / 60_000));
  if (totalMinutes < 1) return 'Less than a minute';
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

/** Countdown as MM:SS, or H:MM:SS for long waits. */
export function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

export function sessionProgress(activeMs: number, thresholdMs: number): number {
  if (!Number.isFinite(activeMs) || !Number.isFinite(thresholdMs) || thresholdMs <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, activeMs / thresholdMs));
}

export function humanizePackage(packageName: string | null): string {
  if (!packageName) return 'No app selected';
  const parts = packageName.split('.');
  const last = parts[parts.length - 1] ?? packageName;
  return last
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatHistoryDate(value: string | null): string {
  if (!value) return 'No history yet';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
