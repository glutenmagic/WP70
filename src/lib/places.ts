import type { PlaceCount } from './api.ts';

/** Most photos first, then by name. */
export function sortByCount(places: PlaceCount[]): PlaceCount[] {
  return [...places].sort((a, b) => b.photo_count - a.photo_count || a.name.localeCompare(b.name, 'en-GB'));
}

/** Lower case, letters and digits only: "Choa Chu Kang" and "choa-chu-kang" both become "choachukang". */
function normalise(text: string): string {
  return text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Places whose name contains the query, ignoring case, spaces and punctuation. */
export function filterByName(places: PlaceCount[], query: string): PlaceCount[] {
  const q = normalise(query);
  if (!q) return places;
  return places.filter((p) => normalise(p.name).includes(q));
}
