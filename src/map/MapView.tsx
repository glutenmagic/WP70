import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PlaceCount } from '../lib/api.ts';
import { BubbleLayer } from './BubbleLayer.ts';
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

interface Props {
  places: PlaceCount[] | null;
  selectedId: string | null;
  onSelect: (placeId: string) => void;
  /** Called for a click or tap on the map itself (not on a bubble). */
  onMapClick?: () => void;
}

/** Room kept clear around a revealed place: the zoom control sits top left. */
const REVEAL_PADDING_TOP_LEFT = L.point(64, 24);
const REVEAL_PADDING_BOTTOM_RIGHT = L.point(24, 24);

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function MapView({ places, selectedId, onSelect, onMapClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<BubbleLayer | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const selectedRef = useRef<L.LatLng | null>(null);

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

    // Focusing a bubble near the edge can make the browser scroll the
    // overflow-hidden container, which throws Leaflet's positions out.
    const resetScroll = () => {
      container.scrollTop = 0;
      container.scrollLeft = 0;
    };
    container.addEventListener('scroll', resetScroll);

    layerRef.current = new BubbleLayer(map, (id) => onSelectRef.current(id));
    mapRef.current = map;

    map.on('click', () => onMapClickRef.current?.());

    // The panel opens beside the map and shrinks it; Leaflet only watches the
    // window, so tell it when the container itself changes size, then keep
    // the selected place in view.
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
      if (selectedRef.current) reveal(map, selectedRef.current, false);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      mapRef.current = null;
      container.removeEventListener('scroll', resetScroll);
      map.off('resize', onResize);
      layerRef.current?.destroy();
      layerRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (places) layerRef.current?.update(places, selectedId, !prefersReducedMotion());
  }, [places, selectedId]);

  // Bring a newly selected place into view (for example from a deep link).
  const place = selectedId ? places?.find((p) => p.place_id === selectedId) : undefined;
  const lat = place?.lat;
  const lng = place?.lng;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || lat === undefined || lng === undefined) {
      selectedRef.current = null;
      return;
    }
    selectedRef.current = L.latLng(lat, lng);
    reveal(map, selectedRef.current, !prefersReducedMotion());
  }, [selectedId, lat, lng]);

  return <div ref={containerRef} className="map" role="region" aria-label="Map of Singapore" tabIndex={0} />;
}

/** Pans just enough to show `latlng` clear of the map's edges and controls. */
function reveal(map: L.Map, latlng: L.LatLng, animate: boolean) {
  map.panInside(latlng, {
    paddingTopLeft: REVEAL_PADDING_TOP_LEFT,
    paddingBottomRight: REVEAL_PADDING_BOTTOM_RIGHT,
    animate,
  });
}
