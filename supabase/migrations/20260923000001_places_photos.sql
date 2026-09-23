-- WP70 live map: core tables.
-- Only the columns the map needs. The submission and moderation specs add
-- their own columns in later migrations.

create table public.places (
  id text primary key
    constraint places_id_slug check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null
    constraint places_name_not_blank check (length(btrim(name)) > 0),
  kind text not null
    constraint places_kind_valid check (kind in ('planning_area', 'venue')),
  -- Loose box around Singapore, to catch swapped or mistyped coordinates.
  lat double precision not null
    constraint places_lat_in_singapore check (lat between 1.1 and 1.5),
  lng double precision not null
    constraint places_lng_in_singapore check (lng between 103.5 and 104.5),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending'
    constraint photos_status_valid check (status in ('pending', 'approved', 'rejected')),
  year int
    constraint photos_year_range check (year between 1900 and 2100),
  place_id text references public.places (id) on update cascade on delete set null,
  thumb_url text,
  caption text,
  credit_name text,
  created_at timestamptz not null default now(),
  -- An approved photo must have something to show on the map.
  constraint photos_approved_has_thumb check (status <> 'approved' or thumb_url is not null)
);

-- Lock both tables down. Public reads go only through the security definer
-- functions in the next migration, which expose approved photos only.
-- Supabase's default privileges grant anon and authenticated full access to
-- new tables in public, so revoke that explicitly as well as enabling RLS
-- with no policies.
alter table public.places enable row level security;
alter table public.photos enable row level security;

revoke all on table public.places from anon, authenticated;
revoke all on table public.photos from anon, authenticated;
