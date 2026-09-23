// Seeds planning areas from URA Master Plan 2019 Planning Area Boundary
// (No Sea), published on data.gov.sg as dataset d_4765db0e87b9c86336792efe8a1f7a66.
//
// Each area's marker point is its pole of inaccessibility (polylabel): the
// point inside the polygon furthest from any edge. Like a point-on-surface
// method it is always inside the area, and it sits visibly in the middle,
// which suits a map bubble. For multi-part areas (islands) the largest part
// is used.
//
// Upserts rows with kind = 'planning_area'. Never touches venue rows, never
// changes `active` on existing rows, and never deletes anything.
//
// Usage: npm run db:seed-places [-- --file path/to/boundaries.geojson] [-- --dry-run]

import { readFile } from 'node:fs/promises';
import polylabel from 'polylabel';
import { connect } from './lib/db.ts';

const DATASET_ID = 'd_4765db0e87b9c86336792efe8a1f7a66';
const POLL_URL = `https://api-open.data.gov.sg/v1/public/api/datasets/${DATASET_ID}/poll-download`;

type Ring = number[][];
type Geometry = { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] };
interface Feature {
  properties: { PLN_AREA_N?: string };
  geometry: Geometry;
}

interface PlaceSeed {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

const args = process.argv.slice(2);
const fileArg = args.includes('--file') ? args[args.indexOf('--file') + 1] : undefined;
const dryRun = args.includes('--dry-run');

async function loadGeoJson(): Promise<{ features: Feature[] }> {
  if (fileArg) return JSON.parse(await readFile(fileArg, 'utf8'));
  const poll = await fetch(POLL_URL);
  if (!poll.ok) throw new Error(`data.gov.sg poll-download failed: ${poll.status}`);
  const { data } = (await poll.json()) as { data?: { url?: string } };
  if (!data?.url) throw new Error('data.gov.sg poll-download returned no URL');
  const file = await fetch(data.url);
  if (!file.ok) throw new Error(`GeoJSON download failed: ${file.status}`);
  return (await file.json()) as { features: Feature[] };
}

/** "CHOA CHU KANG" -> "choa-chu-kang" */
function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** "NORTH-EASTERN ISLANDS" -> "North-Eastern Islands" */
function titleCase(raw: string): string {
  return raw.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** Absolute planar area of a ring (shoelace). Degrees are fine for comparing parts. */
function ringArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return Math.abs(sum) / 2;
}

function largestPolygon(geometry: Geometry): Ring[] {
  if (geometry.type === 'Polygon') return geometry.coordinates;
  return geometry.coordinates.reduce((best, poly) => (ringArea(poly[0]) > ringArea(best[0]) ? poly : best));
}

function pointInRing([x, y]: number[], ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function markerPoint(geometry: Geometry): { lat: number; lng: number } {
  // Drop any Z values; polylabel wants [x, y].
  const polygon = largestPolygon(geometry).map((ring) => ring.map(([x, y]) => [x, y]));
  // ~1 m precision in degrees near the equator.
  const [lng, lat] = polylabel(polygon, 0.00001);
  const inside = pointInRing([lng, lat], polygon[0]) && !polygon.slice(1).some((hole) => pointInRing([lng, lat], hole));
  if (!inside) throw new Error('marker point fell outside its polygon');
  return { lat: round(lat), lng: round(lng) };
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

async function main() {
  const geojson = await loadGeoJson();
  const seeds: PlaceSeed[] = geojson.features.map((f) => {
    const raw = f.properties.PLN_AREA_N;
    if (!raw) throw new Error('feature without PLN_AREA_N');
    try {
      return { id: slugify(raw), name: titleCase(raw), ...markerPoint(f.geometry) };
    } catch (err) {
      throw new Error(`${raw}: ${(err as Error).message}`);
    }
  });
  const ids = new Set(seeds.map((s) => s.id));
  if (ids.size !== seeds.length) throw new Error('duplicate planning area slugs in source data');
  console.log(`Parsed ${seeds.length} planning areas.`);

  if (dryRun) {
    console.table(seeds);
    return;
  }

  const db = connect();
  try {
    console.log(`Target: ${db.label}`);
    const [result] = await db.query<{ inserted: number; updated: number; skipped: string[] }>(
      `
      with src as (
        select * from jsonb_to_recordset($1::jsonb) as s(id text, name text, lat float8, lng float8)
      ),
      up as (
        insert into public.places (id, name, kind, lat, lng)
        select id, name, 'planning_area', lat, lng from src
        on conflict (id) do update
          set name = excluded.name, lat = excluded.lat, lng = excluded.lng
          where places.kind = 'planning_area'
        returning places.id, (xmax = 0) as inserted
      )
      select
        (count(*) filter (where inserted))::int as inserted,
        (count(*) filter (where not inserted))::int as updated,
        array(select id from src except select id from up order by 1) as skipped
      from up
      `,
      [JSON.stringify(seeds)],
    );
    console.log(`Inserted ${result.inserted}, updated ${result.updated}.`);
    if (result.skipped.length) {
      console.warn(`Skipped (id already used by a venue): ${result.skipped.join(', ')}`);
    }
  } finally {
    await db.close();
  }
}

await main();
