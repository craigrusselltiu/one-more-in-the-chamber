alter table public.meta_progression
  add column if not exists unlocked_tiles text[] not null default '{}'::text[];
