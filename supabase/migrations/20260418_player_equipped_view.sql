-- Public projection of equipped cosmetics for the leaderboard.
--
-- meta_progression's RLS is owner-only on purpose (reputation + unlock
-- arrays shouldn't leak), but the leaderboard needs every player's
-- equipped nameplate / colour / title to render rows. This view projects
-- ONLY those three cosmetic columns, bypasses RLS (security_invoker = off),
-- and grants SELECT to anon + authenticated so any viewer can resolve any
-- player's equipped look at fetch time.
--
-- Equipping retroactively updates the leaderboard look of every past
-- entry by design -- the view reads whatever is currently equipped on
-- meta_progression for the player_id, not a snapshot.

create or replace view public.player_equipped_cosmetics
with (security_invoker = off) as
select
  player_id,
  equipped_nameplate,
  equipped_colour,
  equipped_title
from public.meta_progression;

grant select on public.player_equipped_cosmetics to anon, authenticated;
