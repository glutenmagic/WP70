import { useCallback, useSyncExternalStore } from 'react';
import { parseState, serializeState, type MapState } from './urlState.ts';

// The URL is the single source of truth for map state, so deep links, the
// back button and copied links all agree.

const CHANGE_EVENT = 'wp70:urlchange';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

const getSearch = () => window.location.search;

export function useMapState(): [MapState, (patch: Partial<MapState>, mode?: 'replace' | 'push') => void] {
  const search = useSyncExternalStore(subscribe, getSearch);
  const state = parseState(search);

  const update = useCallback((patch: Partial<MapState>, mode: 'replace' | 'push' = 'replace') => {
    const current = parseState(window.location.search);
    const next = serializeState({ ...current, ...patch }, window.location.search);
    if (next === window.location.search) return;
    const url = `${window.location.pathname}${next}${window.location.hash}`;
    if (mode === 'push') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [state, update];
}

/** Rewrites invalid or redundant parameters (e.g. ?decade=1995) to their canonical form. */
export function canonicaliseUrl() {
  const canonical = serializeState(parseState(window.location.search), window.location.search);
  if (canonical !== window.location.search) {
    window.history.replaceState(null, '', `${window.location.pathname}${canonical}${window.location.hash}`);
  }
}
