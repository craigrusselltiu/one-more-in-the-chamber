-- Drop the run_state.trait_counts column.
-- traitCounts is derived from artifacts.tags on load (see syncService.ts
-- computeTraitCounts), so it no longer needs a dedicated column. Keeping
-- the column around just wasted rows' storage with redundant data.

alter table public.run_state drop column if exists trait_counts;
