// Inserts fake photos for load and security testing.
//
// Default: 300,000 rows, roughly 70% approved, 20% pending, 10% rejected,
// years 1957 to 2027, spread across all active places with realistic
// clustering: a handful of places and the general election years are much
// denser, and volume grows towards the present. About 4% have no year and
// 3% no place.
//
// Every fake row has credit_name = 'WP70 test data' and a caption starting
// with '[test] ', which is how --clean finds and deletes them. Real rows are
// never touched.
//
// Usage:
//   npm run db:seed-fake [-- --count 300000]
//   npm run db:clean-fake

import { connect } from './lib/db.ts';

const MARKER_CREDIT = 'WP70 test data';
const MARKER_CAPTION_PREFIX = '[test] ';
const BATCH = 50_000;
const FIRST_YEAR = 1957;
const LAST_YEAR = 2027;

// Singapore general elections, and by-elections (lower weight).
const GE_YEARS = [1959, 1963, 1968, 1972, 1976, 1980, 1984, 1988, 1991, 1997, 2001, 2006, 2011, 2015, 2020, 2025];
const BY_ELECTION_YEARS = [1981, 1992, 2012, 2013];

// Places that should be much denser than the rest, with their weight
// multiplier. Anything not listed here gets a long-tail weight.
const HOT_PLACES: Record<string, number> = {
  hougang: 40,
  serangoon: 18,
  bedok: 14,
  sengkang: 12,
  punggol: 10,
  'marine-parade': 8,
  'downtown-core': 8,
  tampines: 6,
};

const args = process.argv.slice(2);
const clean = args.includes('--clean');
const count = args.includes('--count') ? Number(args[args.indexOf('--count') + 1]) : 300_000;

// Small seeded PRNG so the long-tail place weights are stable between runs.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Converts weights to [lo, hi) buckets on 0..1 for a random() join in SQL. */
function buckets<K>(items: [K, number][]): { key: K; lo: number; hi: number }[] {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let acc = 0;
  return items.map(([key, w], i) => {
    const lo = acc / total;
    acc += w;
    return { key, lo, hi: i === items.length - 1 ? 1.000001 : acc / total };
  });
}

function yearWeights(): [number, number][] {
  const out: [number, number][] = [];
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
    let w = 1 + (y - FIRST_YEAR) / 12; // more photos in recent decades
    if (GE_YEARS.includes(y)) w *= 8;
    else if (BY_ELECTION_YEARS.includes(y)) w *= 3;
    out.push([y, w]);
  }
  return out;
}

function placeWeights(ids: string[]): [string, number][] {
  const rand = mulberry32(70);
  return ids.map((id) => [id, HOT_PLACES[id] ?? 0.2 + rand() * 2.5]);
}

const db = connect();
try {
  console.log(`Target: ${db.label}`);

  if (clean) {
    const [r] = await db.query<{ deleted: number }>(
      `with d as (
         delete from public.photos where credit_name = $1 and caption like $2 returning 1
       ) select count(*)::int as deleted from d`,
      [MARKER_CREDIT, `${MARKER_CAPTION_PREFIX.replace('[', '\\[')}%`],
    );
    console.log(`Deleted ${r.deleted} fake photos.`);
  } else {
    if (!Number.isInteger(count) || count < 1) throw new Error('--count must be a positive integer');

    const [{ existing }] = await db.query<{ existing: number }>(
      'select count(*)::int as existing from public.photos where credit_name = $1',
      [MARKER_CREDIT],
    );
    if (existing > 0) {
      throw new Error(`${existing} fake photos already exist. Run npm run db:clean-fake first.`);
    }

    const places = await db.query<{ id: string }>('select id from public.places where active order by id');
    if (!places.length) throw new Error('No active places. Run npm run db:seed-places first.');

    const placeBuckets = buckets(placeWeights(places.map((p) => p.id)));
    const yearBuckets = buckets(yearWeights());

    for (let start = 1; start <= count; start += BATCH) {
      const end = Math.min(start + BATCH - 1, count);
      await db.query(
        `
        with pl as (
          select * from jsonb_to_recordset($1::jsonb) as t(key text, lo float8, hi float8)
        ),
        yr as (
          select * from jsonb_to_recordset($2::jsonb) as t(key int, lo float8, hi float8)
        ),
        g as (
          select n, random() as rp, random() as ry, random() as rs, random() as rn
          from generate_series($3::int, $4::int) as n
        )
        insert into public.photos (status, year, place_id, thumb_url, caption, credit_name)
        select
          case when g.rs < 0.70 then 'approved' when g.rs < 0.90 then 'pending' else 'rejected' end,
          case when g.rn < 0.04 then null else yr.key end,
          case when g.rn > 0.97 then null else pl.key end,
          'https://picsum.photos/seed/wp70-' || g.n || '/320/240',
          $5 || 'Fake photo #' || g.n,
          $6
        from g
        join pl on g.rp >= pl.lo and g.rp < pl.hi
        join yr on g.ry >= yr.lo and g.ry < yr.hi
        `,
        [JSON.stringify(placeBuckets), JSON.stringify(yearBuckets), start, end, MARKER_CAPTION_PREFIX, MARKER_CREDIT],
      );
      console.log(`  inserted ${end.toLocaleString('en-GB')} / ${count.toLocaleString('en-GB')}`);
    }
  }

  // Refresh planner statistics and the visibility map (which index-only scans rely on).
  try {
    await db.query('vacuum (analyze) public.photos');
  } catch {
    await db.query('analyze public.photos');
  }

  const summary = await db.query(
    `select status, count(*)::int as photos from public.photos group by status order by status`,
  );
  console.table(summary);
} finally {
  await db.close();
}
