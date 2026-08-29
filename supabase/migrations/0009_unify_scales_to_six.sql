-- Unifies sleep_quality and hydration to the same 1-6 scale as
-- energy_level and mental_load, so every check-in scale in the app is
-- consistent. The hydration column is kept as-is (renaming it would touch
-- more code than needed) but its UI label is being repurposed to a
-- self-kindness question instead of a literal hydration question — the
-- CHECK constraint widening here only concerns the numeric range.

ALTER TABLE daily_checkins DROP CONSTRAINT daily_checkins_sleep_quality_check;
ALTER TABLE daily_checkins ADD CONSTRAINT daily_checkins_sleep_quality_check
  CHECK (sleep_quality BETWEEN 1 AND 6);

ALTER TABLE daily_checkins DROP CONSTRAINT daily_checkins_hydration_check;
ALTER TABLE daily_checkins ADD CONSTRAINT daily_checkins_hydration_check
  CHECK (hydration BETWEEN 1 AND 6);
