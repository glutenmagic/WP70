// OneMap basemap settings, checked against https://www.onemap.gov.sg/docs/maps/
// and its TileJSON (https://www.onemap.gov.sg/maps/json/raster/tilejson/2.2.0/Default.json)
// on 23 September 2026.

export const ONEMAP_TILE_URL = 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png';

/** Zoom levels OneMap serves tiles for. */
export const ONEMAP_MIN_ZOOM = 11;
export const ONEMAP_MAX_ZOOM = 19;

/** Area OneMap has tiles for, from its TileJSON: [south, west], [north, east]. */
export const ONEMAP_TILE_BOUNDS: [[number, number], [number, number]] = [
  [1.16, 103.502],
  [1.56073, 104.11475],
];

/**
 * Required by the OneMap Terms of Use: logo plus attribution, exactly as
 * published at https://www.onemap.gov.sg/docs/maps/resources/code-attr.txt
 * DO NOT REMOVE.
 */
export const ONEMAP_ATTRIBUTION =
  '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;" alt=""/>&nbsp;' +
  '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors' +
  '&nbsp;&#124;&nbsp;<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>';

/** Singapore's land extent (URA MP2019 planning areas): what the initial view must show. */
export const SINGAPORE_LAND_BOUNDS: [[number, number], [number, number]] = [
  [1.1587, 103.6057],
  [1.4708, 104.0885],
];

/** Panning limit: the land extent plus a small margin (about 3 to 5 km). */
export const SINGAPORE_MAX_BOUNDS: [[number, number], [number, number]] = [
  [1.13, 103.57],
  [1.5, 104.13],
];
