-- Add killed_by column to scores for leaderboard display.
-- Populated from the run's deathCause field on score submission (enemy name
-- for combat deaths, event title for event deaths, null for completed runs).

alter table public.scores add column if not exists killed_by text;
