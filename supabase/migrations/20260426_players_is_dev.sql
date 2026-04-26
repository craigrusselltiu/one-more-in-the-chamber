-- Store dev-account access on public.players instead of hardcoded client IDs.
-- Apply this once in Supabase SQL editor or through the Supabase CLI.

alter table public.players
  add column if not exists is_dev boolean not null default false;

-- Normal clients can read is_dev, but should not be able to grant it to
-- themselves. Use the Supabase dashboard SQL editor or service role to update it.
revoke insert (is_dev), update (is_dev) on public.players from anon, authenticated;

