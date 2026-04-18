-- Rename the "Ascension" difficulty system to "Wanted Level" to match the
-- Western / outlaw theme of the game. Values are preserved by RENAME COLUMN;
-- no data loss, no backfill needed.

alter table public.runs
  rename column ascension_level to wanted_level;

alter table public.scores
  rename column ascension_level to wanted_level;

alter table public.scores
  rename column ascension_multiplier to wanted_level_multiplier;

alter table public.meta_progression
  rename column highest_ascension_cleared to highest_wanted_level_cleared;
