// Measures place_photo_counts (and place_photo_preview for the busiest place)
// with EXPLAIN ANALYSE, for "All years" and every decade chip.
//
// Reports server-side execution time only: the median of several runs after
// a warm-up, which is what the 200 ms target in the spec is about. Network
// time to the browser is separate.
//
// Usage: npm run db:timings [-- --runs 7] [-- --plans]

import { connect } from './lib/db.ts';

const args = process.argv.slice(2);
const runs = args.includes('--runs') ? Number(args[args.indexOf('--runs') + 1]) : 7;
const showPlans = args.includes('--plans');

const DECADES: [string, number | null, number | null][] = [
  ['All years', null, null],
  ...Array.from({ length: 8 }, (_, i): [string, number, number] => {
    const from = 1950 + i * 10;
    return [`${from}s`, from, from + 9];
  }),
];

type PlanRow = { 'QUERY PLAN': [{ 'Execution Time': number; 'Planning Time': number }] | string };

const db = connect();

async function explain(sql: string, params: unknown[]): Promise<number> {
  const rows = await db.query<PlanRow>(`explain (analyse, format json) ${sql}`, params);
  const raw = rows[0]['QUERY PLAN'];
  const plan = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return plan[0]['Execution Time'];
}

async function median(sql: string, params: unknown[]): Promise<number> {
  await explain(sql, params); // warm-up
  const times: number[] = [];
  for (let i = 0; i < runs; i++) times.push(await explain(sql, params));
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)];
}

async function textPlan(sql: string, params: unknown[]): Promise<string> {
  const rows = await db.query<{ 'QUERY PLAN': string }>(`explain (analyse, buffers) ${sql}`, params);
  return rows.map((r) => r['QUERY PLAN']).join('\n');
}

// The function body, run directly so EXPLAIN can show its plan (a security
// definer function is opaque to EXPLAIN on the caller's side).
const COUNTS_BODY = `
  select pl.id, pl.name, pl.kind, pl.lat, pl.lng, count(ph.id) as photo_count
  from places pl
  join photos ph
    on ph.place_id = pl.id
   and ph.status = 'approved'
   and ($1::int is null or ph.year >= $1::int)
   and ($2::int is null or ph.year <= $2::int)
  where pl.active
  group by pl.id, pl.name, pl.kind, pl.lat, pl.lng`;

try {
  console.log(`Target: ${db.label}`);
  const [stats] = await db.query<{ total: number; approved: number; places: number; version: string }>(`
    select (select count(*)::int from public.photos) as total,
           (select count(*)::int from public.photos where status = 'approved') as approved,
           (select count(*)::int from public.places where active) as places,
           current_setting('server_version') as version`);
  console.log(
    `Postgres ${stats.version}; ${stats.total.toLocaleString('en-GB')} photos ` +
      `(${stats.approved.toLocaleString('en-GB')} approved), ${stats.places} active places. ` +
      `Median of ${runs} runs after warm-up.\n`,
  );

  const results: Record<string, string>[] = [];
  for (const [label, from, to] of DECADES) {
    const fn = await median('select * from public.place_photo_counts($1, $2)', [from, to]);
    const [{ n }] = await db.query<{ n: number }>(
      'select count(*)::int as n from public.place_photo_counts($1, $2)',
      [from, to],
    );
    results.push({ decade: label, 'places returned': String(n), 'place_photo_counts (ms)': fn.toFixed(1) });
  }
  console.table(results);

  const [busiest] = await db.query<{ place_id: string }>(
    'select place_id from public.place_photo_counts() order by photo_count desc limit 1',
  );
  const preview = await median('select * from public.place_photo_preview($1, null, null, 12)', [busiest.place_id]);
  console.log(`place_photo_preview('${busiest.place_id}', All years, 12): ${preview.toFixed(1)} ms\n`);

  if (showPlans) {
    console.log('Plan for the place_photo_counts body, All years:\n');
    console.log(await textPlan(COUNTS_BODY, [null, null]));
    console.log('\nPlan for the place_photo_counts body, 1990s:\n');
    console.log(await textPlan(COUNTS_BODY, [1990, 1999]));
  }
} finally {
  await db.close();
}
