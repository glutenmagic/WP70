# Phase 1 report: schema, functions, seeding, timings

## Delivered

- `supabase/migrations/20260923000001_places_photos.sql`: `places` and a minimal `photos` table, with checks, RLS enabled and table privileges revoked from `anon` and `authenticated`.
- `supabase/migrations/20260923000002_map_functions.sql`: the partial index, `place_photo_counts`, `place_photo_preview` and the grants.
- `scripts/seed-places.ts`: 55 planning areas from data.gov.sg dataset `d_4765db0e87b9c86336792efe8a1f7a66` (Master Plan 2019 Planning Area Boundary (No Sea)), all active.
- `scripts/seed-fake-photos.ts`: 300,000 fake photos, plus `--clean`.
- `supabase/tests/map_functions_security.sql` and `scripts/test-db.ts`.
- `scripts/time-queries.ts`.

## Changes from the spec, and why

| Spec | Built | Why |
|---|---|---|
| Index on `(place_id, year)` | `(place_id, year, id)` | `count(ph.id)` needs `id`. With the spec's index the planner ignores it and does a sequential scan. With `id` included it becomes an index-only scan with zero heap fetches. At 300,000 rows both are fast (see timings), but only the covering index is actually used. |
| `grant execute ... to anon` | Also `revoke execute ... from public`, and grant to `authenticated` too | Postgres grants EXECUTE on new functions to PUBLIC by default, so without the revoke every role can call them. `authenticated` is granted so the map still works for signed-in users such as moderators. |
| `p_limit int default 12` | Clamped to 0 to 48 | Otherwise anyone can pull the whole archive in one call. |
| (not specified) | Preview also requires `places.active` | Keeps preview consistent with counts: an inactive place shows nothing. |
| (not specified) | Preview orders unknown years last | `year asc` with an explicit `nulls last`. |
| (not specified) | `photos` check: approved rows need a `thumb_url` | The map cannot show an approved photo without one. |
| Point-on-surface centroid | Pole of inaccessibility (`polylabel`), largest part for multi-part areas | Like point-on-surface it is always inside the area, but it lands in the visual middle rather than possibly near an edge. The script checks every point falls inside its polygon. |

## New dependencies (all dev-only, none shipped to the browser)

- `polylabel` (plus its one dependency, `tinyqueue`): marker point for each planning area. About 150 lines, from Mapbox.
- `pg` and `@types/pg`: direct Postgres connection for local runs.
- `typescript` and `@types/node`: type-checking. These will be needed for the Vite app anyway.

## Fake data shape

About 70% approved, 20% pending and 10% rejected. Years run 1957 to 2027, with general election years weighted 8 times, by-election years 3 times, and volume growing towards the present. About 4% have no year and 3% no place. A few places are much denser: Hougang has about 43,000 approved photos, Serangoon about 20,000, and the smallest places a few hundred each. Every fake row has `credit_name = 'WP70 test data'` and a caption starting `[test] `, which is how `db:clean-fake` finds them.

## Security test

`npm run db:test` checks, as `anon`:

- direct `select` on `photos` and `places` is refused
- counts for fixtures match approved rows only, for All years and a decade
- a place with only pending or rejected photos, and an inactive place, never appear
- counts for every place and every decade chip match approved-only ground truth across the whole 300,000-row table
- preview never returns a non-approved id for any place and any decade across the whole table
- preview order is by year, with unknown years last
- `p_limit` is clamped

It also checks the exact result columns of both functions, that PUBLIC has no EXECUTE, and that `anon` does.

I checked the test by breaking things on purpose. It failed, as it should, when:

- preview included pending photos
- counts included rejected photos
- `anon` was granted `select` on `photos`
- PUBLIC was granted EXECUTE

## Timings

Server-side execution time from `EXPLAIN ANALYSE`: the median of 7 runs after one warm-up. Target: under 200 ms.

### Local: Supabase Postgres 17.6 image in Docker, 300,000 photos (209,674 approved)

| Filter | Places returned | `place_photo_counts` |
|---|---|---|
| All years | 55 | 31 ms |
| 1950s | 55 | 17 ms |
| 1960s | 55 | 15 ms |
| 1970s | 55 | 15 ms |
| 1980s | 55 | 17 ms |
| 1990s | 55 | 17 ms |
| 2000s | 55 | 16 ms |
| 2010s | 55 | 21 ms |
| 2020s | 55 | 20 ms |

`place_photo_preview('hougang', All years, 12)`: 0.2 ms.

Plans: All years uses a parallel index-only scan over the partial index. Decades use a nested loop over places with an index-only scan per place.

### Supabase project `wp70`

Pending. Needs `SUPABASE_ACCESS_TOKEN` in the environment.

## Recommendation on `place_decade_counts`

Not needed. The worst case is about 6 times under target on local hardware. A precomputed table only becomes worth its trigger complexity if `wp70` timings come in close to 200 ms, which is unlikely at this volume.
