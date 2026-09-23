import { lazy, Suspense, useEffect } from 'react';
import { DecadeFilter } from './components/DecadeFilter.tsx';
import { SiteFooter } from './components/SiteFooter.tsx';
import { SiteHeader } from './components/SiteHeader.tsx';
import { ViewToggle } from './components/ViewToggle.tsx';
import { isEmbedded } from './config.ts';
import { decadeLabel } from './lib/decades.ts';
import { canonicaliseUrl, useMapState } from './lib/useMapState.ts';

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

  useEffect(canonicaliseUrl, []);

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
      <main className="app__main">
        {state.view === 'map' ? (
          <Suspense fallback={<div className="map-loading">Loading map…</div>}>
            <MapView />
          </Suspense>
        ) : (
          <section className="list-view" aria-labelledby="list-heading">
            <h2 id="list-heading">Places</h2>
            <p>The list of places arrives in Phase 5.</p>
          </section>
        )}
      </main>
      {!embedded && <SiteFooter />}
    </div>
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
