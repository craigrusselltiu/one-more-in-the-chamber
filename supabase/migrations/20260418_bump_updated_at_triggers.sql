-- Auto-bump updated_at on UPDATE so manual edits in the Supabase SQL editor
-- (e.g. reputation, run gold) get a fresh timestamp without having to remember
-- to set it explicitly. The client-side merge then picks remote as the winner
-- on the next sync.
--
-- Run this once in the Supabase SQL editor. Idempotent.

create or replace function public.bump_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists meta_progression_set_updated_at on public.meta_progression;
create trigger meta_progression_set_updated_at
  before update on public.meta_progression
  for each row execute function public.bump_updated_at();

drop trigger if exists runs_set_updated_at on public.runs;
create trigger runs_set_updated_at
  before update on public.runs
  for each row execute function public.bump_updated_at();

drop trigger if exists run_state_set_updated_at on public.run_state;
create trigger run_state_set_updated_at
  before update on public.run_state
  for each row execute function public.bump_updated_at();

-- Cascade: editing run_state (e.g. gold, health) should also bump the parent
-- runs.updated_at so syncRuns picks remote as the winner on the next sync.
create or replace function public.bump_parent_run_updated_at()
returns trigger
language plpgsql
as $$
begin
  update public.runs set updated_at = now() where id = new.run_id;
  return new;
end;
$$;

drop trigger if exists run_state_bump_parent on public.run_state;
create trigger run_state_bump_parent
  after update on public.run_state
  for each row execute function public.bump_parent_run_updated_at();
