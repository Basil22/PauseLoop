import { useEffect, useState } from 'react';

import { native } from '@/lib/native';

const iconCache = new Map<string, string | null>();

/**
 * Resolves a launcher icon once and shares it across every mounted consumer.
 * The cache map is also the local state source so a cached icon renders without
 * an extra effect-driven state update.
 */
export function useAppIcon(packageName: string, enabled = true) {
  const [icons, setIcons] = useState(() => new Map(iconCache));
  const icon = enabled ? (icons.get(packageName) ?? null) : null;
  const loading = enabled && !icons.has(packageName);

  useEffect(() => {
    if (!enabled || iconCache.has(packageName)) {
      return;
    }

    let cancelled = false;
    native
      .getAppIcon(packageName)
      .then((dataUri) => {
        iconCache.set(packageName, dataUri);
      })
      .catch(() => {
        iconCache.set(packageName, null);
      })
      .finally(() => {
        if (!cancelled) {
          setIcons(new Map(iconCache));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, packageName]);

  return { icon, loading };
}
