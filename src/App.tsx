import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { DecadeFilter } from './components/DecadeFilter.tsx';
import { EmptyDecade, LoadError } from './components/EmptyDecade.tsx';
import { LIST_SEARCH_ID, ListView } from './components/ListView.tsx';
import { PlacePanel } from './components/PlacePanel.tsx';
import { SiteFooter } from './components/SiteFooter.tsx';
import { SiteHeader } from './components/SiteHeader.tsx';
import { ViewToggle } from './components/ViewToggle.tsx';
import { isEmbedded } from './config.ts';
import { decadeLabel, type Decade } from './lib/decades.ts';
import { useCounts, type CountsState } from './lib/useCounts.ts';
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
  const decadeEmpty = counts.status === 'ready' && counts.data.length === 0;

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
    // Return focus to the bubble or list row that opened the panel.
    requestAnimationFrame(() => {
      const trigger = closing ? document.querySelector<HTMLElement>(`[data-place="${closing}"]`) : null;
      (trigger ?? document.querySelector<HTMLElement>('.map, .list-view'))?.focus();
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

  const showAllYears = useCallback(() => setState({ decade: null }), [setState]);

  const skipToList = () => {
    setState({ view: 'list' });
    requestAnimationFrame(() => document.getElementById(LIST_SEARCH_ID)?.focus());
  };

  useEffect(() => {
    const where = panelPlace ? `${panelPlace.place.name}, ` : '';
    document.title = `${where}${decadeLabel(state.decade)}: WP70 Photo Archive map`;
  }, [state.decade, panelPlace]);

  return (
    <div className="app" data-view={state.view}>
      <a
        href={`?view=list`}
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          skipToList();
        }}
      >
        Skip to list of places
      </a>
      {!embedded && <SiteHeader place={state.place} decade={state.decade} />}
      <div className="filter-bar">
        <DecadeFilter
          value={state.decade}
          onChange={(decade) => setState({ decade })}
          loading={counts.status === 'loading' && counts.data === null}
        />
        <ViewToggle value={state.view} onChange={(view) => setState({ view })} />
      </div>
      <main className="app__main" data-panel={panelPlace ? 'open' : 'closed'}>
        <h1 className="visually-hidden">WP70 Photo Archive: photos by place and decade</h1>
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
              <MapStates counts={counts} decade={state.decade} embedded={embedded} onShowAllYears={showAllYears} />
            </>
          ) : (
            <section className="list-view" aria-labelledby="list-heading" tabIndex={-1}>
              <h2 id="list-heading">Places</h2>
              {counts.status === 'error' ? (
                <LoadError what="the list of places" onRetry={counts.retry} />
              ) : decadeEmpty ? (
                <EmptyDecade decade={state.decade} embedded={embedded} onShowAllYears={showAllYears} />
              ) : counts.data ? (
                <ListView
                  places={counts.data}
                  decade={state.decade}
                  selectedId={panelPlace ? state.place : null}
                  onSelect={selectPlace}
                />
              ) : (
                <p className="list-view__loading">Loading places…</p>
              )}
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
              showAllYears();
              // The button goes away once photos show; keep focus in the panel.
              requestAnimationFrame(() => document.getElementById('place-panel-title')?.focus());
            }}
          />
        )}
      </main>
      {!embedded && <SiteFooter />}
      <Announcer counts={counts} />
    </div>
  );
}

/** Loading bar, empty decade and error, over the map. */
function MapStates({
  counts,
  decade,
  embedded,
  onShowAllYears,
}: {
  counts: CountsState & { retry: () => void };
  decade: Decade | null;
  embedded: boolean;
  onShowAllYears: () => void;
}) {
  if (counts.status === 'loading') return <div className="map-progress" aria-hidden="true" />;
  if (counts.status === 'error') {
    return (
      <div className="map-overlay">
        <LoadError what="the photo map" onRetry={counts.retry} />
      </div>
    );
  }
  if (counts.data.length === 0) {
    return (
      <div className="map-overlay">
        <EmptyDecade decade={decade} embedded={embedded} onShowAllYears={onShowAllYears} />
      </div>
    );
  }
  return null;
}

/**
 * Tells screen reader users what changed after they pick a decade. Silent on
 * the first load, which the page itself describes.
 */
function Announcer({ counts }: { counts: CountsState }) {
  const [message, setMessage] = useState('');
  const firstLoad = useRef(true);

  useEffect(() => {
    if (counts.status === 'loading') {
      // Clear, so the same result is announced again after the next change.
      setMessage('');
      return;
    }
    if (counts.status === 'error') return; // LoadError announces itself.
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    // Use the decade the data is for, never a decade still loading.
    const { decade } = counts;
    const n = counts.data.length;
    const when = decade === null ? 'all years' : `the ${decadeLabel(decade)}`;
    setMessage(
      n === 0
        ? `No photos from ${decade === null ? 'any year' : `the ${decadeLabel(decade)}`} yet.`
        : `${n} ${n === 1 ? 'place' : 'places'} with photos from ${when}.`,
    );
    // counts.decade always changes together with counts.data.
  }, [counts.status, counts.data]);

  return (
    <p className="visually-hidden" role="status" aria-live="polite">
      {message}
    </p>
  );
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
