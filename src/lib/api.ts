import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../config.ts';
import { DECADES, decadeRange, type Decade } from './decades.ts';

export interface PlaceCount {
  place_id: string;
  name: string;
  kind: 'planning_area' | 'venue';
  lat: number;
  lng: number;
  photo_count: number;
}

async function rpc<T>(fn: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal,
  });
  if (!res.ok) throw new Error(`${fn} failed with HTTP ${res.status}`);
  return (await res.json()) as T;
}

// Session cache of counts per decade (key "all" for All years). Holds the
// promise, so concurrent requests for the same decade share one fetch.
// Failed requests are dropped so a retry refetches.
const countsCache = new Map<string, Promise<PlaceCount[]>>();

const cacheKey = (decade: Decade | null) => (decade === null ? 'all' : String(decade));

export function fetchCounts(decade: Decade | null): Promise<PlaceCount[]> {
  const key = cacheKey(decade);
  let pending = countsCache.get(key);
  if (!pending) {
    const { from, to } = decadeRange(decade);
    pending = rpc<PlaceCount[]>('place_photo_counts', { p_from: from, p_to: to }).then((rows) =>
      rows.map((r) => ({ ...r, photo_count: Number(r.photo_count) })),
    );
    pending.catch(() => countsCache.delete(key));
    countsCache.set(key, pending);
  }
  return pending;
}

/** Counts already in the cache (resolved or in flight) for this decade. */
export function hasCounts(decade: Decade | null): boolean {
  return countsCache.has(cacheKey(decade));
}

let prefetchStarted = false;

/**
 * Quietly loads every other decade, one at a time, once the browser is idle,
 * so switching chips is served from the cache.
 */
export function prefetchAllDecades(): void {
  if (prefetchStarted) return;
  prefetchStarted = true;
  const queue: (Decade | null)[] = [null, ...DECADES].filter((d) => !hasCounts(d));
  const next = () => {
    const decade = queue.shift();
    if (decade === undefined) return;
    fetchCounts(decade).then(schedule, schedule);
  };
  const schedule = () => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(next, { timeout: 2000 });
    else setTimeout(next, 200);
  };
  schedule();
}

export interface PhotoPreview {
  id: string;
  thumb_url: string;
  year: number | null;
  caption: string | null;
  credit_name: string | null;
}

export const PREVIEW_LIMIT = 12;

const previewCache = new Map<string, Promise<PhotoPreview[]>>();

/** Up to 12 approved thumbnails for a place and decade, cached for the session. */
export function fetchPreview(placeId: string, decade: Decade | null): Promise<PhotoPreview[]> {
  const key = `${placeId}|${cacheKey(decade)}`;
  let pending = previewCache.get(key);
  if (!pending) {
    const { from, to } = decadeRange(decade);
    pending = rpc<PhotoPreview[]>('place_photo_preview', {
      p_place: placeId,
      p_from: from,
      p_to: to,
      p_limit: PREVIEW_LIMIT,
    });
    pending.catch(() => previewCache.delete(key));
    previewCache.set(key, pending);
  }
  return pending;
}
