import type { PermissionStatus } from '@native/index';
import { AppState } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage } from '@/lib/format';
import { native } from '@/lib/native';

const EMPTY_PERMISSIONS: PermissionStatus = {
  usageAccess: false,
  overlay: false,
  notifications: false,
  batteryOptimizationIgnored: false,
};

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionStatus>(EMPTY_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const next = await native.getPermissionStatus();
      if (mounted.current) {
        setPermissions(next);
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

  const afterSettings = useCallback(
    async (action: string, operation: () => Promise<void>) => {
      setBusyAction(action);
      setError(null);
      try {
        await operation();
        // Settings screens pause the app; AppState refresh covers the native
        // path. This short delay also updates the web/mock preview.
        await new Promise((resolve) => setTimeout(resolve, 450));
        await refresh();
      } catch (caught) {
        setError(errorMessage(caught));
      } finally {
        setBusyAction(null);
      }
    },
    [refresh],
  );

  const openUsageAccess = useCallback(
    () => afterSettings('usage', () => native.openUsageAccessSettings()),
    [afterSettings],
  );

  const openOverlay = useCallback(
    () => afterSettings('overlay', () => native.openOverlaySettings()),
    [afterSettings],
  );

  const requestNotifications = useCallback(
    () => afterSettings('notifications', () => native.requestNotificationPermission()),
    [afterSettings],
  );

  const openBatteryOptimization = useCallback(
    () => afterSettings('battery', () => native.openBatteryOptimizationSettings()),
    [afterSettings],
  );

  const monitoringReady = permissions.usageAccess && permissions.overlay;
  const grantedCount = [
    permissions.usageAccess,
    permissions.overlay,
    permissions.notifications,
  ].filter(Boolean).length;

  return {
    permissions,
    loading,
    busyAction,
    error,
    refresh,
    openUsageAccess,
    openOverlay,
    requestNotifications,
    openBatteryOptimization,
    monitoringReady,
    grantedCount,
  };
}
