import { useEffect, useState } from 'react';
import { fetchCounts, type PlaceCount } from './api.ts';

export type SelectedPlace =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'unknown' }
  | { status: 'ready'; place: PlaceCount; count: number };

/**
 * Resolves the selected place id (from the URL) to its details and its count
 * for the current decade (the decade `counts` was loaded for). A place with no photos in this decade still
 * resolves, with count 0, using the All years data. An id that matches no
 * place with approved photos resolves to 'unknown'.
 */
export function useSelectedPlace(
  placeId: string | null,
  counts: { status: 'loading' | 'ready' | 'error'; data: PlaceCount[] | null },
): SelectedPlace {
  const [fallback, setFallback] = useState<{ id: string; place: PlaceCount | null } | null>(null);
  const inDecade = counts.status === 'ready' ? counts.data?.find((p) => p.place_id === placeId) : undefined;
  const needFallback = placeId !== null && counts.status === 'ready' && !inDecade;

  useEffect(() => {
    if (!needFallback || !placeId) return;
    let current = true;
    fetchCounts(null).then(
      (all) => current && setFallback({ id: placeId, place: all.find((p) => p.place_id === placeId) ?? null }),
      () => current && setFallback({ id: placeId, place: null }),
    );
    return () => {
      current = false;
    };
  }, [needFallback, placeId]);

  if (!placeId) return { status: 'none' };
  if (inDecade) return { status: 'ready', place: inDecade, count: inDecade.photo_count };
  if (!needFallback || fallback?.id !== placeId) return { status: 'loading' };
  if (!fallback.place) return { status: 'unknown' };
  return { status: 'ready', place: fallback.place, count: 0 };
}
