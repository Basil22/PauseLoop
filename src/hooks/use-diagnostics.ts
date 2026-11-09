import type { DebugState, InstalledApp, UsageEvent } from '@native/index';
import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage } from '@/lib/format';
import { native } from '@/lib/native';

const YOUTUBE_PACKAGE = 'com.google.android.youtube';

export function useDiagnostics(active = true) {
  const [debugState, setDebugState] = useState<DebugState | null>(null);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [state, youtubeEvents] = await Promise.all([
        native.getDebugState(),
        native.getRecentUsageEvents(YOUTUBE_PACKAGE, 20),
      ]);
      if (mounted.current) {
        setDebugState(state);
        setEvents(youtubeEvents);
        setError(null);
      }
    } catch (caught) {
      if (mounted.current) {
        setError(errorMessage(caught));
      }
    } finally {
      if (mounted.current) {
        setRefreshing(false);
      }
    }
  }, []);

  const loadApps = useCallback(async () => {
    setLoadingApps(true);
    try {
      const installed = await native.getInstalledApps();
      if (mounted.current) {
        setApps(installed);
        setError(null);
      }
    } catch (caught) {
      if (mounted.current) {
        setError(errorMessage(caught));
      }
    } finally {
      if (mounted.current) {
        setLoadingApps(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void loadApps();
    return () => {
      mounted.current = false;
    };
  }, [loadApps]);

  useEffect(() => {
    if (!active) return;
    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, 1_500);
    return () => clearInterval(interval);
  }, [active, refresh]);

  return {
    debugState,
    apps,
    events,
    loadingApps,
    refreshing,
    error,
    refresh,
    reloadApps: loadApps,
    youtubePackage: YOUTUBE_PACKAGE,
  };
}

export function useInstalledApps() {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const installed = await native.getInstalledApps();
      if (mounted.current) {
        setApps(installed);
        setError(null);
      }
    } catch (caught) {
      if (mounted.current) {
        setError(errorMessage(caught));
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  return { apps, loading, error, refresh };
}
