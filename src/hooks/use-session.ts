import type { SessionSnapshot } from '@native/index';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { errorMessage } from '@/lib/format';
import { isNativeAvailable, native } from '@/lib/native';

/**
 * Polls the native session snapshot while the app is open. The service keeps
 * counting in the background; this hook only mirrors its state for the UI.
 */
export function useSession(active = true) {
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const activeRef = useRef(active);
  activeRef.current = active;

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const next = await native.getSessionState();
      if (mounted.current) {
        setSession(next);
        setError(null);
      }
    } catch (caught) {
      if (mounted.current) {
        setError(errorMessage(caught));
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!active) {
      return () => {
        mounted.current = false;
      };
    }

    void refresh();

    const interval = setInterval(() => {
      if (AppState.currentState === 'active' && activeRef.current) {
        void refresh();
      }
    }, 2_000);

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      }
    });

    const subscriptions: { remove: () => void }[] = [];
    if (isNativeAvailable) {
      subscriptions.push(native.addListener('onOverlayAction', () => void refresh()));
      subscriptions.push(native.addListener('onMonitoringStateChanged', () => void refresh()));
    }

    return () => {
      mounted.current = false;
      clearInterval(interval);
      appStateSubscription.remove();
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [active, refresh]);

  return { session, loading, error, refresh };
}
