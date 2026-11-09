import { AppState } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage } from '@/lib/format';
import { isNativeAvailable, native } from '@/lib/native';

export function useMonitoring() {
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const next = await native.isMonitoring();
      if (mounted.current) {
        setRunning(next);
      }
      return next;
    } catch (caught) {
      if (mounted.current) {
        setError(errorMessage(caught));
      }
      return false;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      }
    });

    const interval = setInterval(() => {
      void refresh();
    }, 3_000);

    let eventSubscription: { remove: () => void } | null = null;
    if (isNativeAvailable) {
      eventSubscription = native.addListener('onMonitoringStateChanged', ({ running: next }) => {
        if (mounted.current) {
          setRunning(next);
        }
      });
    }

    return () => {
      mounted.current = false;
      clearInterval(interval);
      appStateSubscription.remove();
      eventSubscription?.remove();
    };
  }, [refresh]);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await native.startMonitoring();
      await new Promise((resolve) => setTimeout(resolve, 350));
      const next = await native.isMonitoring();
      if (mounted.current) {
        setRunning(next);
      }
      return true;
    } catch (caught) {
      if (mounted.current) {
        setError(errorMessage(caught));
      }
      return false;
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }
  }, []);

  const stop = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await native.stopMonitoring();
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (mounted.current) {
        setRunning(false);
      }
      return true;
    } catch (caught) {
      if (mounted.current) {
        setError(errorMessage(caught));
      }
      return false;
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }
  }, []);

  const toggle = useCallback(async () => {
    return running ? stop() : start();
  }, [running, start, stop]);

  return { running, busy, error, refresh, start, stop, toggle };
}
