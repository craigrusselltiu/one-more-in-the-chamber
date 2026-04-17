-- Catch-all JSONB column on run_state to hold fields that don't have a
-- dedicated column yet (combatsCleared, elitesCleared, bossesDefeated,
-- flawlessFights, longestCascade, totalDamageDealt, runStartedAt,
-- playTimeSeconds, goldObtained, artifactsObtained, the pending* flags,
-- merchantPurchases, merchantSnapshots, eventBag, etc.).
--
-- pushRun serializes the entire RunState into extra_state; pullRemoteRun
-- prefers extra_state over the hand-picked columns. This means schema
-- additions to RunState no longer require a migration.

alter table public.run_state
  add column if not exists extra_state jsonb;
