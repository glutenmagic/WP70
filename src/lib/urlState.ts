// Shareable map state in the query string:
//   ?decade=1990   selected decade (absent means All years)
//   ?place=hougang selected place
//   ?view=list     list view (absent means map)
// Any other parameters (for example embed=1) are left untouched.

import { isDecade, type Decade } from './decades.ts';

export type View = 'map' | 'list';

export interface MapState {
  decade: Decade | null;
  place: string | null;
  view: View;
}

const PLACE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function parseState(search: string): MapState {
  const params = new URLSearchParams(search);

  const rawDecade = params.get('decade');
  const decadeNumber = rawDecade !== null && /^\d{4}$/.test(rawDecade) ? Number(rawDecade) : NaN;
  const decade = isDecade(decadeNumber) ? decadeNumber : null;

  const rawPlace = params.get('place');
  const place = rawPlace !== null && rawPlace.length <= 64 && PLACE_ID.test(rawPlace) ? rawPlace : null;

  const view: View = params.get('view') === 'list' ? 'list' : 'map';

  return { decade, place, view };
}

/** Writes `state` into `search`, keeping unrelated parameters. Returns "" or "?...". */
export function serializeState(state: MapState, search = ''): string {
  const params = new URLSearchParams(search);
  setOrDelete(params, 'decade', state.decade === null ? null : String(state.decade));
  setOrDelete(params, 'place', state.place);
  setOrDelete(params, 'view', state.view === 'list' ? 'list' : null);
  const out = params.toString();
  return out ? `?${out}` : '';
}

function setOrDelete(params: URLSearchParams, key: string, value: string | null) {
  if (value === null) params.delete(key);
  else params.set(key, value);
}
