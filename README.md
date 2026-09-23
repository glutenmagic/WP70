# WP70 Photo Archive

Public photo archive for WP70. This repo holds the live map (a Vite + React app, from Phase 2) and its Supabase schema.

## Layout

| Path | What |
|---|---|
| `supabase/migrations/` | Schema, indexes and public functions, applied in filename order |
| `supabase/tests/` | SQL tests. Each runs in a rolled-back transaction and raises on failure |
| `scripts/` | One-off Node scripts: migrate, seed, test, time queries |
| `docs/` | Phase reports and checklists |

## Requirements

- Node 22.18 or later (scripts run as TypeScript directly, with no build step)
- `npm install`

## Database access

Scripts read connection details from `.env` (copy `.env.example`). Two options:

1. **Supabase Management API** (HTTPS only). Set `SUPABASE_ACCESS_TOKEN` (a personal access token) and `SUPABASE_PROJECT_REF`. Use this where Postgres ports are blocked.
2. **Direct Postgres.** Set `DATABASE_URL`. This takes precedence when set.

For a disposable local database with the same roles as Supabase:

```sh
docker run -d --name wp70db -p 54322:5432 -e POSTGRES_PASSWORD=postgres supabase/postgres:17.6.1.175
export DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54322/postgres
```

## Scripts

| Command | What it does |
|---|---|
| `npm run db:migrate` | Applies new migrations. Records them in `supabase_migrations.schema_migrations`, the same table the Supabase CLI uses |
| `npm run db:seed-places` | Downloads URA MP2019 planning area boundaries from data.gov.sg and upserts one row per area. Never touches venues or `active` |
| `npm run db:seed-fake` | Inserts 300,000 fake photos (`-- --count N` to change). Refuses to run if fake rows already exist |
| `npm run db:clean-fake` | Deletes every fake photo, and nothing else |
| `npm run db:test` | Runs `supabase/tests/*.sql` |
| `npm run db:timings` | `EXPLAIN ANALYSE` timings for the map functions (`-- --plans` to print plans) |
| `npm run typecheck` | Type-checks the scripts |

## Security model

- `places` and `photos` have RLS enabled with no policies, and `anon`/`authenticated` have no table privileges.
- The public reads are `place_photo_counts` and `place_photo_preview`. These are `security definer` functions that return approved photos in active places only, with a fixed column list.
- `EXECUTE` is revoked from `PUBLIC` and granted to `anon` and `authenticated` only.
- `place_photo_preview` clamps `p_limit` to 0 to 48.
- Supabase image transformations must stay disabled. The app only ever reads `thumb_url`.
