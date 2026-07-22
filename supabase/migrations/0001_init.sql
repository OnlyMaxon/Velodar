-- ============================================================================
-- Bike Radar — initial schema
-- Postgres + PostGIS + Realtime + Auth (anonymous)
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- It is idempotent-ish (uses IF NOT EXISTS / CREATE OR REPLACE where possible),
-- but is meant to be applied once on a fresh project.
-- ============================================================================

-- --- Extensions -------------------------------------------------------------
create extension if not exists postgis;
-- pg_cron is optional; used to auto-expire reports server-side.
-- If your plan / project does not have it, skip it — the read functions below
-- also filter by expires_at so stale reports are hidden regardless.
create extension if not exists pg_cron;

-- --- Enums ------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'report_type') then
    create type report_type as enum ('police', 'camera', 'ebike_control');
  end if;
  if not exists (select 1 from pg_type where typname = 'vote_type') then
    create type vote_type as enum ('up', 'down');
  end if;
end$$;

-- --- Tables -----------------------------------------------------------------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  type        report_type not null,
  lat         double precision not null,
  lng         double precision not null,
  -- Spatial column derived from lat/lng, kept in sync by a trigger.
  geog        geography(Point, 4326),
  created_at  timestamptz not null default now(),
  -- Default lifetime ~35 min (mid-point of the 30–40 min window).
  expires_at  timestamptz not null default (now() + interval '35 minutes'),
  upvotes     integer not null default 0,
  downvotes   integer not null default 0,
  is_active   boolean not null default true,
  created_by  uuid references auth.users (id) on delete set null
);

create table if not exists public.report_votes (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.reports (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  vote        vote_type not null,
  created_at  timestamptz not null default now(),
  -- One vote per user per report (prevents double voting).
  unique (report_id, user_id)
);

-- --- Indexes ----------------------------------------------------------------
create index if not exists reports_geog_idx      on public.reports using gist (geog);
create index if not exists reports_active_idx     on public.reports (is_active, expires_at);
create index if not exists report_votes_report_idx on public.report_votes (report_id);

-- --- Keep geog in sync with lat/lng ----------------------------------------
create or replace function public.reports_set_geog()
returns trigger
language plpgsql
as $$
begin
  new.geog := st_setsrid(st_makepoint(new.lng, new.lat), 4326)::geography;
  return new;
end;
$$;

drop trigger if exists reports_set_geog_trg on public.reports;
create trigger reports_set_geog_trg
  before insert or update of lat, lng on public.reports
  for each row execute function public.reports_set_geog();

-- ============================================================================
-- Read: nearby active reports
-- ----------------------------------------------------------------------------
-- Returns active, non-expired reports within `radius_m` metres of (lat, lng).
-- Also returns the caller's own vote on each report (null if not voted) so the
-- client can render the vote buttons in the correct state.
-- ============================================================================
create or replace function public.nearby_reports(
  in_lat     double precision,
  in_lng     double precision,
  radius_m   double precision default 15000
)
returns table (
  id          uuid,
  type        report_type,
  lat         double precision,
  lng         double precision,
  created_at  timestamptz,
  expires_at  timestamptz,
  upvotes     integer,
  downvotes   integer,
  is_active   boolean,
  distance_m  double precision,
  my_vote     vote_type
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id, r.type, r.lat, r.lng, r.created_at, r.expires_at,
    r.upvotes, r.downvotes, r.is_active,
    st_distance(r.geog, st_setsrid(st_makepoint(in_lng, in_lat), 4326)::geography) as distance_m,
    v.vote as my_vote
  from public.reports r
  left join public.report_votes v
    on v.report_id = r.id and v.user_id = auth.uid()
  where r.is_active
    and r.expires_at > now()
    and st_dwithin(
          r.geog,
          st_setsrid(st_makepoint(in_lng, in_lat), 4326)::geography,
          radius_m
        )
  order by distance_m asc;
$$;

-- ============================================================================
-- Write: create a report
-- ----------------------------------------------------------------------------
-- Thin wrapper so the client never sets server-controlled columns
-- (expires_at, counts, created_by). Returns the new row id.
-- ============================================================================
create or replace function public.create_report(
  in_type report_type,
  in_lat  double precision,
  in_lng  double precision
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;

  insert into public.reports (type, lat, lng, created_by)
  values (in_type, in_lat, in_lng, auth.uid())
  returning id into new_id;

  return new_id;
end;
$$;

-- ============================================================================
-- Write: cast a vote ("actual" / "gone") — Waze-style confirmation
-- ----------------------------------------------------------------------------
-- - One vote per user per report; re-voting updates the previous vote.
-- - Recomputes upvotes/downvotes from the votes table (single source of truth).
-- - "gone" logic: a report is deactivated when enough people say it's gone.
--     * >= DOWN_THRESHOLD down-votes, AND down-votes strictly outnumber up-votes.
-- - An up-vote (still there) extends the lifetime a little, capped, so a
--   confirmed report doesn't vanish mid-ride.
-- ============================================================================
create or replace function public.cast_vote(
  in_report_id uuid,
  in_vote      vote_type
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  down_threshold constant integer := 3;
  up_count   integer;
  down_count integer;
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;

  insert into public.report_votes (report_id, user_id, vote)
  values (in_report_id, auth.uid(), in_vote)
  on conflict (report_id, user_id)
  do update set vote = excluded.vote, created_at = now();

  select
    count(*) filter (where vote = 'up'),
    count(*) filter (where vote = 'down')
  into up_count, down_count
  from public.report_votes
  where report_id = in_report_id;

  update public.reports r
  set
    upvotes   = up_count,
    downvotes = down_count,
    is_active = case
                  when down_count >= down_threshold and down_count > up_count
                    then false
                  else r.is_active
                end,
    -- Each fresh "still there" confirmation nudges expiry out by 10 min,
    -- but never beyond 60 min from creation.
    expires_at = case
                   when in_vote = 'up'
                     then least(r.created_at + interval '60 minutes',
                                greatest(r.expires_at, now() + interval '10 minutes'))
                   else r.expires_at
                 end
  where r.id = in_report_id;
end;
$$;

-- ============================================================================
-- Maintenance: expire old reports
-- ----------------------------------------------------------------------------
-- Flips is_active -> false for anything past expires_at. Running this as a job
-- makes the change propagate over Realtime so clients drop the marker live.
-- ============================================================================
create or replace function public.expire_reports()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.reports
  set is_active = false
  where is_active and expires_at <= now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Schedule every minute (safe to re-run; unschedule first if it exists).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'bike_radar_expire_reports') then
      perform cron.unschedule('bike_radar_expire_reports');
    end if;
    perform cron.schedule(
      'bike_radar_expire_reports',
      '* * * * *',
      $cron$ select public.expire_reports(); $cron$
    );
  end if;
exception when others then
  -- pg_cron not available on this plan — ignore, read paths still filter by time.
  raise notice 'pg_cron scheduling skipped: %', sqlerrm;
end$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.reports      enable row level security;
alter table public.report_votes enable row level security;

-- Reports: any authenticated user can read; writes go through SECURITY DEFINER
-- RPCs above, so no direct insert/update policy is granted to clients.
drop policy if exists reports_select on public.reports;
create policy reports_select
  on public.reports for select
  to authenticated
  using (true);

-- Votes: a user may read their own votes (counts are read via reports/RPC).
drop policy if exists report_votes_select_own on public.report_votes;
create policy report_votes_select_own
  on public.report_votes for select
  to authenticated
  using (user_id = auth.uid());

-- --- Grants for RPCs --------------------------------------------------------
grant execute on function public.nearby_reports(double precision, double precision, double precision) to authenticated;
grant execute on function public.create_report(report_type, double precision, double precision) to authenticated;
grant execute on function public.cast_vote(uuid, vote_type) to authenticated;

-- ============================================================================
-- Realtime
-- ----------------------------------------------------------------------------
-- Broadcast INSERT/UPDATE/DELETE on reports so nearby clients update live.
-- (Clients still filter by distance/active on their side.)
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'reports'
  ) then
    alter publication supabase_realtime add table public.reports;
  end if;
end$$;

-- Send full row data on UPDATE/DELETE (so clients see previous values, e.g. id).
alter table public.reports replica identity full;
