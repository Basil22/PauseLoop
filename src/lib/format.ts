export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error.length > 0) {
    return error;
  }
  return 'Something went wrong. Please try again.';
}

export function formatTimeAgo(timestamp: number): string {
  const elapsed = Date.now() - timestamp;
  if (elapsed < 5_000) return 'just now';
  if (elapsed < 60_000) return `${Math.round(elapsed / 1_000)}s ago`;
  if (elapsed < 3_600_000) return `${Math.round(elapsed / 60_000)}m ago`;
  return `${Math.round(elapsed / 3_600_000)}h ago`;
}

export function formatClockTime(timestamp: number): string {
  // 24-hour time keeps the diagnostics rail compact in every locale.
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatEventType(type: string): string {
  return type
    .replace(/^ACTIVITY_/, '')
    .replace(/^SCREEN_/, 'SCREEN ')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export function shortPackage(packageName: string | null): string {
  if (!packageName) return '—';
  const parts = packageName.split('.');
  if (parts.length <= 2) return packageName;
  return `…${parts.slice(-2).join('.')}`;
}

export function monogram(label: string): string {
  return label.trim().slice(0, 1).toUpperCase() || '?';
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
