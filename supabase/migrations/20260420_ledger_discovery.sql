-- Ledger discovery tracking. Per-player arrays of every tile, artifact, and
-- consumable the player has ever encountered in a run. Kept separate from the
-- shop-purchase unlocked_* arrays so a run pickup doesn't make a paid shop
-- item appear already-owned. Additive union merge on login.

alter table public.meta_progression
  add column if not exists discovered_tiles       text[] not null default '{}'::text[],
  add column if not exists discovered_artifacts   text[] not null default '{}'::text[],
  add column if not exists discovered_consumables text[] not null default '{}'::text[];
