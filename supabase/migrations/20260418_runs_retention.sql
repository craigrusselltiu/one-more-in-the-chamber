-- Runs retention: keep only the 10 most-recently-updated runs per player.
-- Run once in the Supabase SQL editor. Safe to re-run.

-- ============================================================================
-- 1. One-time cleanup: delete every existing run beyond the 10-per-player cap.
--    run_state rows cascade on runs delete (see 20260417_sync_tables.sql), so
--    this single statement cleans both tables.
-- ============================================================================
with ranked as (
  select id,
         row_number() over (partition by player_id order by updated_at desc) as rn
  from public.runs
)
delete from public.runs
where id in (select id from ranked where rn > 10);

-- ============================================================================
-- 2. Ongoing enforcement: after each insert, prune the inserting player's
--    rows back down to the cap. security definer so the trigger can delete
--    regardless of the caller's RLS context.
-- ============================================================================
create or replace function public.enforce_runs_retention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.runs
  where id in (
    select id
    from public.runs
    where player_id = new.player_id
    order by updated_at desc
    offset 10
  );
  return new;
end;
$$;

drop trigger if exists runs_retention_trigger on public.runs;
create trigger runs_retention_trigger
after insert on public.runs
for each row execute function public.enforce_runs_retention();
