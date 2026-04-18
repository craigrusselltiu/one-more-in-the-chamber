-- Extend meta_progression with the new unlock categories and the per-player
-- equipped cosmetic selections. All existing rows default to empty arrays /
-- null equipped slots; unlockedCharacters stays keyed by id in its own column.

alter table public.meta_progression
  add column if not exists unlocked_skins       text[] not null default '{}'::text[],
  add column if not exists unlocked_nameplates  text[] not null default '{}'::text[],
  add column if not exists unlocked_colours     text[] not null default '{}'::text[],
  add column if not exists unlocked_titles      text[] not null default '{}'::text[],
  add column if not exists equipped_skin        text,
  add column if not exists equipped_nameplate   text,
  add column if not exists equipped_colour      text,
  add column if not exists equipped_title       text;
