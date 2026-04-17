-- Extend public.players with the constraints the auth flow expects.
-- Run this once in the Supabase SQL editor (or psql).

-- 1. If there are any existing rows with null display_name, either delete
-- them or backfill before applying the NOT NULL constraint.
-- select id from public.players where display_name is null;
-- update public.players set display_name = 'user_' || substr(id::text, 1, 6) where display_name is null;

-- 2. FK to auth.users so delete-cascade and auth.uid() checks work.
alter table public.players
  add constraint players_id_fkey foreign key (id)
  references auth.users(id) on delete cascade;

-- 3. display_name must be present and within sensible bounds.
alter table public.players
  alter column display_name set not null;

alter table public.players
  drop constraint if exists players_display_name_len_chk;
alter table public.players
  add constraint players_display_name_len_chk
  check (char_length(display_name) between 1 and 32);

-- 4. Case-insensitive uniqueness.
create unique index if not exists players_display_name_lower_idx
  on public.players (lower(display_name));

-- 5. RLS: anyone can read (leaderboard identity display), owner can modify own row.
alter table public.players enable row level security;

drop policy if exists players_read_any   on public.players;
drop policy if exists players_insert_own on public.players;
drop policy if exists players_update_own on public.players;

create policy players_read_any   on public.players for select using (true);
create policy players_insert_own on public.players for insert with check (auth.uid() = id);
create policy players_update_own on public.players for update using (auth.uid() = id);
