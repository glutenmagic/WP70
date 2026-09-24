import { lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import { DecadeFilter } from './components/DecadeFilter.tsx';
import { PlacePanel } from './components/PlacePanel.tsx';
import { SiteFooter } from './components/SiteFooter.tsx';
import { SiteHeader } from './components/SiteHeader.tsx';
import { ViewToggle } from './components/ViewToggle.tsx';
import { isEmbedded } from './config.ts';
import { decadeLabel } from './lib/decades.ts';
import { useCounts } from './lib/useCounts.ts';
import { canonicaliseUrl, useMapState } from './lib/useMapState.ts';
import { usePreview } from './lib/usePreview.ts';
import { useSelectedPlace } from './lib/useSelectedPlace.ts';

const MapView = lazy(() => import('./map/MapView.tsx'));

export function App() {
  if (window.location.pathname === '/') {
    // Cloudflare Pages redirects / to /map (public/_redirects); this covers the dev server.
    window.history.replaceState(null, '', `/map${window.location.search}${window.location.hash}`);
  }
  if (window.location.pathname.replace(/\/$/, '') !== '/map') return <NotFound />;
  return <MapPage />;
}

function MapPage() {
  const [state, setState] = useMapState();
  const embedded = isEmbedded();
  const counts = useCounts(state.decade);
  const selected = useSelectedPlace(state.place, counts);
  const panelPlace = selected.status === 'ready' ? selected : null;
  const preview = usePreview(panelPlace && panelPlace.count > 0 ? panelPlace.place.place_id : null, state.decade);

  // Focus moves into the panel only when the user opened it, not when a
  // deep link restores it on page load.
  const openedByUser = useRef(false);

  useEffect(canonicaliseUrl, []);

  // A place id that matches no place with approved photos: drop it from the URL.
  useEffect(() => {
    if (selected.status === 'unknown') setState({ place: null });
  }, [selected.status, setState]);

  const selectPlace = useCallback(
    (place: string) => {
      openedByUser.current = true;
      setState({ place }, 'push');
    },
    [setState],
  );

  const closePanel = useCallback(() => {
    const closing = state.place;
    setState({ place: null }, 'push');
    // Return focus to the bubble (or list row) that opened the panel.
    requestAnimationFrame(() => {
      const trigger = closing ? document.querySelector<HTMLElement>(`[data-place="${closing}"]`) : null;
      (trigger ?? document.querySelector<HTMLElement>('.map'))?.focus();
    });
  }, [state.place, setState]);

  useEffect(() => {
    if (!panelPlace) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) closePanel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [panelPlace, closePanel]);

  useEffect(() => {
    document.title = `${decadeLabel(state.decade)}: WP70 Photo Archive map`;
  }, [state.decade]);

  return (
    <div className="app" data-view={state.view}>
      {!embedded && <SiteHeader place={state.place} decade={state.decade} />}
      <div className="filter-bar">
        <DecadeFilter value={state.decade} onChange={(decade) => setState({ decade })} />
        <ViewToggle value={state.view} onChange={(view) => setState({ view })} />
      </div>
      <main className="app__main" data-panel={panelPlace ? 'open' : 'closed'}>
        <div className="app__content">
          {state.view === 'map' ? (
            <>
              <Suspense fallback={<div className="map-loading">Loading map…</div>}>
                <MapView
                  places={counts.data}
                  selectedId={panelPlace ? state.place : null}
                  onSelect={selectPlace}
                  onMapClick={panelPlace ? closePanel : undefined}
                />
              </Suspense>
              <MapStatus status={counts.status} onRetry={counts.retry} />
            </>
          ) : (
            <section className="list-view" aria-labelledby="list-heading">
              <h2 id="list-heading">Places</h2>
              <p>The list of places arrives in Phase 5.</p>
            </section>
          )}
        </div>
        {panelPlace && (
          <PlacePanel
            place={panelPlace.place}
            count={panelPlace.count}
            decade={state.decade}
            preview={preview}
            embedded={embedded}
            focusOnOpen={openedByUser.current}
            onClose={closePanel}
            onShowAllYears={() => {
              setState({ decade: null });
              // The button goes away once photos show; keep focus in the panel.
              requestAnimationFrame(() => document.getElementById('place-panel-title')?.focus());
            }}
          />
        )}
      </main>
      {!embedded && <SiteFooter />}
    </div>
  );
}

/** Minimal loading and error states; Phase 5 finishes these. */
function MapStatus({ status, onRetry }: { status: 'loading' | 'ready' | 'error'; onRetry: () => void }) {
  if (status === 'loading') {
    return (
      <div className="map-status map-status--loading" role="status">
        Loading photos…
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="map-status" role="alert">
        <span>Sorry, the photo counts didn’t load.</span>
        <button type="button" className="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }
  return null;
}

function NotFound() {
  return (
    <main className="not-found">
      <h1>Page not found</h1>
      <p>
        <a href="/map">Go to the photo map</a>
      </p>
    </main>
  );
}
