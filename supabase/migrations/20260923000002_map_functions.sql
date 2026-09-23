-- WP70 live map: public read functions and the index behind them.

-- Covers both functions. Partial on approved rows, so pending and rejected
-- photos never enter the index. `id` is included so place_photo_counts can
-- run as an index-only scan and place_photo_preview can read rows in
-- (year, id) order without a sort.
create index photos_approved_place_year
  on public.photos (place_id, year, id)
  where status = 'approved';

-- Per-place counts of approved photos, optionally limited to a year range.
-- Returns only active places with at least one approved photo in range.
-- Photos with a null year match only when both bounds are null ("All years").
create function public.place_photo_counts(
  p_from int default null,
  p_to int default null
)
returns table (
  place_id text,
  name text,
  kind text,
  lat double precision,
  lng double precision,
  photo_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select pl.id, pl.name, pl.kind, pl.lat, pl.lng, count(ph.id) as photo_count
  from places pl
  join photos ph
    on ph.place_id = pl.id
   and ph.status = 'approved'
   and (p_from is null or ph.year >= p_from)
   and (p_to is null or ph.year <= p_to)
  where pl.active
  group by pl.id, pl.name, pl.kind, pl.lat, pl.lng;
$$;

-- Thumbnails for the selected place's preview panel. Approved photos only,
-- ordered by year (unknown years last), then id. p_limit is clamped to 0..48
-- so the public endpoint cannot be used to page through the whole archive
-- in one call.
create function public.place_photo_preview(
  p_place text,
  p_from int default null,
  p_to int default null,
  p_limit int default 12
)
returns table (
  id uuid,
  thumb_url text,
  year int,
  caption text,
  credit_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select ph.id, ph.thumb_url, ph.year, ph.caption, ph.credit_name
  from photos ph
  join places pl
    on pl.id = ph.place_id
   and pl.active
  where ph.place_id = p_place
    and ph.status = 'approved'
    and (p_from is null or ph.year >= p_from)
    and (p_to is null or ph.year <= p_to)
  order by ph.year asc nulls last, ph.id asc
  limit least(greatest(coalesce(p_limit, 12), 0), 48);
$$;

-- Postgres grants EXECUTE on new functions to PUBLIC by default. Remove that
-- so only the roles named below can call these.
revoke execute on function public.place_photo_counts(int, int) from public;
revoke execute on function public.place_photo_preview(text, int, int, int) from public;

grant execute on function public.place_photo_counts(int, int) to anon, authenticated;
grant execute on function public.place_photo_preview(text, int, int, int) to anon, authenticated;
