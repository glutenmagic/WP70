import { useCallback, useEffect, useState } from 'react';
import { fetchCounts, prefetchAllDecades, type PlaceCount } from './api.ts';
import type { Decade } from './decades.ts';

export type CountsState =
  | { status: 'loading'; data: PlaceCount[] | null }
  | { status: 'ready'; data: PlaceCount[] }
  | { status: 'error'; data: PlaceCount[] | null };

/**
 * Counts for the selected decade. While a new decade loads, the previous
 * decade's data stays in `data` so bubbles can animate from it.
 */
export function useCounts(decade: Decade | null): CountsState & { retry: () => void } {
  const [state, setState] = useState<CountsState>({ status: 'loading', data: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setState((prev) => ({ status: 'loading', data: prev.data }));
    fetchCounts(decade).then(
      (data) => {
        if (!current) return;
        setState({ status: 'ready', data });
        prefetchAllDecades();
      },
      () => {
        if (current) setState((prev) => ({ status: 'error', data: prev.data }));
      },
    );
    return () => {
      current = false;
    };
  }, [decade, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
