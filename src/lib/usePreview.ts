import { useCallback, useEffect, useState } from 'react';
import { fetchPreview, type PhotoPreview } from './api.ts';
import type { Decade } from './decades.ts';

export type PreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; photos: PhotoPreview[] }
  | { status: 'error' };

/** Preview thumbnails for a place and decade. Pass null to skip fetching. */
export function usePreview(placeId: string | null, decade: Decade | null): PreviewState & { retry: () => void } {
  const [state, setState] = useState<PreviewState>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!placeId) {
      setState({ status: 'idle' });
      return;
    }
    let current = true;
    setState({ status: 'loading' });
    fetchPreview(placeId, decade).then(
      (photos) => current && setState({ status: 'ready', photos }),
      () => current && setState({ status: 'error' }),
    );
    return () => {
      current = false;
    };
  }, [placeId, decade, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
