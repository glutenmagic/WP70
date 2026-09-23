import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ONEMAP_ATTRIBUTION,
  ONEMAP_MAX_ZOOM,
  ONEMAP_MIN_ZOOM,
  ONEMAP_TILE_BOUNDS,
  ONEMAP_TILE_URL,
  SINGAPORE_LAND_BOUNDS,
  SINGAPORE_MAX_BOUNDS,
} from './onemap.ts';

// Loaded lazily from App, so Leaflet and its CSS only download on the map view.

const FIT_PADDING = L.point(12, 12);

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const land = L.latLngBounds(SINGAPORE_LAND_BOUNDS);
    const map = L.map(container, {
      maxBounds: L.latLngBounds(SINGAPORE_MAX_BOUNDS),
      maxBoundsViscosity: 1,
      maxZoom: ONEMAP_MAX_ZOOM,
      // Whole zoom steps only: fractional zoom leaves visible seams between
      // scaled raster tiles.
      zoomSnap: 1,
    });
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>');

    // OneMap serves zoom 11 to 19 only. On a 375 px phone, all of Singapore
    // needs zoom 10, so there Leaflet shows zoom 11 tiles at half size
    // (minNativeZoom) instead of requesting tiles OneMap does not have. On a
    // 2x screen that is still one tile pixel per screen pixel.
    // detectRetina requests one zoom level higher on high-density screens,
    // so the native range shifts down by one there.
    const retina = L.Browser.retina;
    L.tileLayer(ONEMAP_TILE_URL, {
      detectRetina: true,
      minNativeZoom: retina ? ONEMAP_MIN_ZOOM - 1 : ONEMAP_MIN_ZOOM,
      maxNativeZoom: retina ? ONEMAP_MAX_ZOOM - 1 : ONEMAP_MAX_ZOOM,
      maxZoom: ONEMAP_MAX_ZOOM,
      bounds: L.latLngBounds(ONEMAP_TILE_BOUNDS),
      attribution: ONEMAP_ATTRIBUTION,
    }).addTo(map);

    // Never let people zoom out past the view that shows the whole island.
    const fitIsland = (reset: boolean) => {
      const fitZoom = map.getBoundsZoom(land, false, FIT_PADDING);
      map.setMinZoom(fitZoom);
      if (reset) map.fitBounds(land, { padding: FIT_PADDING, animate: false });
    };
    fitIsland(true);

    const onResize = () => fitIsland(map.getZoom() < map.getBoundsZoom(land, false, FIT_PADDING));
    map.on('resize', onResize);

    return () => {
      map.off('resize', onResize);
      map.remove();
    };
  }, []);

  return <div ref={containerRef} className="map" role="region" aria-label="Map of Singapore" />;
}
