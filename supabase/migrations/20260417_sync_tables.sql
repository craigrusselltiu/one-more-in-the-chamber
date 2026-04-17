-- Core sync tables for progression, runs, and scores.
-- Run this once in the Supabase SQL editor. Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).

-- ============================================================================
-- meta_progression : 1 row per player, pulled + merged on login
-- ============================================================================
create table if not exists public.meta_progression (
  player_id                 uuid primary key references auth.users(id) on delete cascade,
  reputation                integer not null default 0,
  unlocked_artifacts        text[]  not null default '{}',
  unlocked_events           text[]  not null default '{}',
  unlocked_cosmetics        text[]  not null default '{}',
  unlocked_loadouts         text[]  not null default '{}',
  unlocked_characters       text[]  not null default array['red_panda'],
  highest_ascension_cleared integer not null default -1,
  updated_at                timestamptz not null default now()
);

-- ============================================================================
-- runs : active + completed runs, 1 row per run
-- ============================================================================
create table if not exists public.runs (
  id               uuid primary key,
  player_id        uuid not null references auth.users(id) on delete cascade,
  character        text not null,
  status           text not null,     -- 'active' | 'completed' | 'abandoned'
  seed             text,
  ascension_level  integer not null default 0,
  current_act      integer not null default 1,
  current_node_id  text,
  updated_at       timestamptz not null default now()
);
create index if not exists runs_player_idx on public.runs(player_id);
create index if not exists runs_status_idx on public.runs(status);

-- ============================================================================
-- run_state : detailed state for each run (1:1 with runs)
-- ============================================================================
create table if not exists public.run_state (
  run_id            uuid primary key references public.runs(id) on delete cascade,
  health            integer,
  max_health        integer,
  gold              integer,
  active_tile_types text[],
  tile_upgrades     jsonb,
  artifacts         jsonb,
  trait_counts      jsonb,
  consumables       jsonb,
  ability_charge    integer,
  map_state         jsonb,
  combat_state      jsonb,
  updated_at        timestamptz not null default now()
);

-- ============================================================================
-- scores : append-only leaderboard entries
-- ============================================================================
create table if not exists public.scores (
  id                   uuid primary key,
  player_id            uuid references auth.users(id) on delete set null,
  player_name          text,
  run_id               uuid,
  character            text,
  ascension_level      integer,
  base_score           integer,
  bonus_points         integer,
  ascension_multiplier numeric,
  time_bonus           integer,
  final_score          integer not null,
  run_duration_seconds integer,
  nodes_cleared        integer,
  bosses_defeated      integer,
  run_completed        boolean not null default false,
  tiles                jsonb,
  artifacts            jsonb,
  created_at           timestamptz not null default now()
);
create index if not exists scores_final_score_idx on public.scores(final_score desc);
create index if not exists scores_created_at_idx on public.scores(created_at desc);

-- ============================================================================
-- RLS
-- ============================================================================

-- meta_progression: owner-only RW
alter table public.meta_progression enable row level security;
drop policy if exists meta_select_own on public.meta_progression;
drop policy if exists meta_insert_own on public.meta_progression;
drop policy if exists meta_update_own on public.meta_progression;
create policy meta_select_own on public.meta_progression for select using (auth.uid() = player_id);
create policy meta_insert_own on public.meta_progression for insert with check (auth.uid() = player_id);
create policy meta_update_own on public.meta_progression for update using (auth.uid() = player_id) with check (auth.uid() = player_id);

-- runs: owner-only RW
alter table public.runs enable row level security;
drop policy if exists runs_select_own on public.runs;
drop policy if exists runs_insert_own on public.runs;
drop policy if exists runs_update_own on public.runs;
drop policy if exists runs_delete_own on public.runs;
create policy runs_select_own on public.runs for select using (auth.uid() = player_id);
create policy runs_insert_own on public.runs for insert with check (auth.uid() = player_id);
create policy runs_update_own on public.runs for update using (auth.uid() = player_id) with check (auth.uid() = player_id);
create policy runs_delete_own on public.runs for delete using (auth.uid() = player_id);

-- run_state: gated through runs ownership
alter table public.run_state enable row level security;
drop policy if exists run_state_select_own on public.run_state;
drop policy if exists run_state_insert_own on public.run_state;
drop policy if exists run_state_update_own on public.run_state;
drop policy if exists run_state_delete_own on public.run_state;
create policy run_state_select_own on public.run_state
  for select using (exists (select 1 from public.runs r where r.id = run_state.run_id and r.player_id = auth.uid()));
create policy run_state_insert_own on public.run_state
  for insert with check (exists (select 1 from public.runs r where r.id = run_state.run_id and r.player_id = auth.uid()));
create policy run_state_update_own on public.run_state
  for update using (exists (select 1 from public.runs r where r.id = run_state.run_id and r.player_id = auth.uid()))
  with check (exists (select 1 from public.runs r where r.id = run_state.run_id and r.player_id = auth.uid()));
create policy run_state_delete_own on public.run_state
  for delete using (exists (select 1 from public.runs r where r.id = run_state.run_id and r.player_id = auth.uid()));

-- scores: public read (leaderboard), insert-own, no update, no delete
alter table public.scores enable row level security;
drop policy if exists scores_select_any on public.scores;
drop policy if exists scores_insert_own on public.scores;
create policy scores_select_any on public.scores for select using (true);
create policy scores_insert_own on public.scores for insert
  with check (auth.uid() is not null and auth.uid() = player_id);
