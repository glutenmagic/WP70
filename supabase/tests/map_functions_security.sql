-- Security tests for the public map functions.
-- Runs inside a transaction that is always rolled back, so it leaves no trace.
-- Any failed assertion raises an error, which fails `npm run db:test`.
--
-- Covers:
-- - anon cannot read places or photos directly
-- - PUBLIC has no EXECUTE on either function; anon has
-- - both functions return exactly the documented columns
-- - pending and rejected photos never appear in either function's output,
--   checked against fixtures and against every row in the table
-- - inactive places are hidden
-- - p_limit is clamped

begin;

-- Fixtures, created as the table owner.
insert into public.places (id, name, kind, lat, lng, active) values
  ('zz-test-area', 'Test Area', 'planning_area', 1.35, 103.80, true),
  ('zz-test-venue', 'Test Venue', 'venue', 1.36, 103.81, true),
  ('zz-test-inactive', 'Test Inactive', 'venue', 1.37, 103.82, false);

insert into public.photos (status, year, place_id, thumb_url, caption, credit_name) values
  ('approved', 1991, 'zz-test-area', 'https://example.invalid/1.jpg', 'zz approved 1991', 'zz'),
  ('approved', 1997, 'zz-test-area', 'https://example.invalid/2.jpg', 'zz approved 1997', 'zz'),
  ('approved', null, 'zz-test-area', 'https://example.invalid/3.jpg', 'zz approved no year', 'zz'),
  ('pending', 1991, 'zz-test-area', 'https://example.invalid/4.jpg', 'zz pending 1991', 'zz'),
  ('rejected', 1991, 'zz-test-area', 'https://example.invalid/5.jpg', 'zz rejected 1991', 'zz'),
  ('pending', null, 'zz-test-area', null, 'zz pending no year', 'zz'),
  -- The venue has only non-approved photos: it must never appear.
  ('pending', 1975, 'zz-test-venue', 'https://example.invalid/6.jpg', 'zz pending venue', 'zz'),
  ('rejected', 1975, 'zz-test-venue', 'https://example.invalid/7.jpg', 'zz rejected venue', 'zz'),
  -- Approved, but the place is inactive: must never appear.
  ('approved', 1991, 'zz-test-inactive', 'https://example.invalid/8.jpg', 'zz approved inactive', 'zz');

-- Privilege and shape checks, as owner.
do $$
begin
  assert pg_get_function_result('public.place_photo_counts(int,int)'::regprocedure)
    = 'TABLE(place_id text, name text, kind text, lat double precision, lng double precision, photo_count bigint)',
    'place_photo_counts returns unexpected columns';
  assert pg_get_function_result('public.place_photo_preview(text,int,int,int)'::regprocedure)
    = 'TABLE(id uuid, thumb_url text, year integer, caption text, credit_name text)',
    'place_photo_preview returns unexpected columns';

  assert has_function_privilege('anon', 'public.place_photo_counts(int,int)', 'execute'),
    'anon cannot execute place_photo_counts';
  assert has_function_privilege('anon', 'public.place_photo_preview(text,int,int,int)', 'execute'),
    'anon cannot execute place_photo_preview';
  assert not exists (
    select 1
    from pg_proc p, aclexplode(p.proacl) a
    where p.oid in ('public.place_photo_counts(int,int)'::regprocedure,
                    'public.place_photo_preview(text,int,int,int)'::regprocedure)
      and a.grantee = 0 -- PUBLIC
  ), 'PUBLIC still has EXECUTE on a map function';

  assert not has_table_privilege('anon', 'public.photos', 'select'), 'anon has SELECT on photos';
  assert not has_table_privilege('anon', 'public.places', 'select'), 'anon has SELECT on places';
end $$;

-- Ground truth for the whole table, captured as owner for the anon checks.
-- decade_from is null for "All years".
create temp table zz_expected_counts on commit drop as
  select d.decade_from, pl.id as place_id, count(*) as n
  from (select null::int as decade_from union all select generate_series(1950, 2020, 10)) d
  join public.photos ph
    on ph.status = 'approved'
   and (d.decade_from is null or ph.year between d.decade_from and d.decade_from + 9)
  join public.places pl on pl.id = ph.place_id and pl.active
  group by d.decade_from, pl.id;
create temp table zz_not_approved on commit drop as
  select id from public.photos where status <> 'approved';
create temp table zz_active_places on commit drop as
  select id from public.places where active;
grant select on zz_expected_counts, zz_not_approved, zz_active_places to anon;

set local role anon;

do $$
declare
  v_n bigint;
  bad bigint;
  captions text[];
begin
  -- Direct table access is refused.
  begin
    perform 1 from public.photos limit 1;
    raise exception 'anon could read public.photos';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.places limit 1;
    raise exception 'anon could read public.places';
  exception when insufficient_privilege then null;
  end;

  -- Counts on fixtures.
  select photo_count into v_n from public.place_photo_counts() where place_id = 'zz-test-area';
  assert v_n = 3, format('All years count for zz-test-area: expected 3, got %s', v_n);

  select photo_count into v_n from public.place_photo_counts(1990, 1999) where place_id = 'zz-test-area';
  assert v_n = 2, format('1990s count for zz-test-area: expected 2, got %s', v_n);

  assert not exists (select 1 from public.place_photo_counts(1950, 1959) where place_id = 'zz-test-area'),
    'zz-test-area appears in the 1950s with no approved photos';
  assert not exists (select 1 from public.place_photo_counts() where place_id in ('zz-test-venue', 'zz-test-inactive')),
    'a place with no visible approved photos appears in counts';

  -- Counts on the whole table, for "All years" and every decade chip:
  -- must match approved-only ground truth exactly, place by place.
  select count(*) into bad
  from (select null::int as decade_from union all select generate_series(1950, 2020, 10)) d
  cross join lateral (
    select c.place_id, c.photo_count, e.n
    from public.place_photo_counts(d.decade_from, d.decade_from + 9) c
    full join (select place_id, n from zz_expected_counts e
               where e.decade_from is not distinct from d.decade_from) e using (place_id)
  ) x
  where x.photo_count is distinct from x.n;
  assert bad = 0, format('%s place/decade counts differ from approved-only ground truth', bad);

  -- Preview on fixtures: approved only, year order with unknown last.
  select array_agg(p.caption order by p.ord) into captions
  from public.place_photo_preview('zz-test-area') with ordinality
    as p(id, thumb_url, year, caption, credit_name, ord);
  assert captions = array['zz approved 1991', 'zz approved 1997', 'zz approved no year'],
    format('preview for zz-test-area returned %s', captions);

  assert not exists (select 1 from public.place_photo_preview('zz-test-venue')), 'preview shows non-approved venue photos';
  assert not exists (select 1 from public.place_photo_preview('zz-test-inactive')), 'preview shows an inactive place';

  -- Preview on the whole table: no non-approved id for any place, any decade.
  select count(*) into bad
  from zz_active_places pl
  cross join (select null::int as f union all select generate_series(1950, 2020, 10)) d
  cross join lateral public.place_photo_preview(pl.id, d.f, d.f + 9, 48) p
  where p.id in (select id from zz_not_approved);
  assert bad = 0, format('%s non-approved photos returned by place_photo_preview', bad);

  -- Limit clamping.
  select count(*) into v_n from public.place_photo_preview('zz-test-area', null, null, 1000000);
  assert v_n <= 48, 'p_limit is not clamped';
  select count(*) into v_n from public.place_photo_preview('zz-test-area', null, null, -5);
  assert v_n = 0, 'negative p_limit returned rows';
end $$;

rollback;
