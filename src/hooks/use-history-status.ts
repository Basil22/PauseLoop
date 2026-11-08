import type { HistoryStatus } from '@native/index';
import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage } from '@/lib/format';
import { native } from '@/lib/native';

export function useHistoryStatus(active = true) {
  const [history, setHistory] = useState<HistoryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await native.getHistoryStatus();
      if (mounted.current) {
        setHistory(next);
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

  const clear = useCallback(async () => {
    setClearing(true);
    setError(null);
    try {
      await native.clearHistory();
      if (mounted.current) {
        setHistory({
          daysStored: 0,
          oldestDate: null,
          newestDate: null,
          totalMonitoredMs: 0,
          retentionDays: 90,
        });
      }
      return true;
    } catch (caught) {
      if (mounted.current) {
        setError(errorMessage(caught));
      }
      return false;
    } finally {
      if (mounted.current) {
        setClearing(false);
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
    return () => {
      mounted.current = false;
    };
  }, [active, refresh]);

  return { history, loading, clearing, error, refresh, clear };
}
