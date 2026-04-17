-- Enforce "at most one active run per player" + add device-session tracking.
-- Run this once in the Supabase SQL editor. Idempotent.

-- 1. Cleanup: if any player already has 2+ active runs, keep only the most
-- recently updated one and mark the others as abandoned. Without this the
-- unique index below would fail to create.
with keepers as (
  select distinct on (player_id) id
  from public.runs
  where status = 'active'
  order by player_id, updated_at desc
)
update public.runs
set status = 'abandoned',
    updated_at = now()
where status = 'active'
  and id not in (select id from keepers);

-- 2. Session tracking: which tab/device currently owns the active run.
-- Null when nobody has claimed it yet (legacy rows).
alter table public.runs
  add column if not exists session_id uuid;

-- 3. Enforce: at most one active run per player (server-side guard).
create unique index if not exists runs_one_active_per_player
  on public.runs (player_id)
  where status = 'active';
