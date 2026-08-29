-- Slows plant growth to at most one visible phase advance every 2 days,
-- regardless of how many water drops accumulate in that window. Drops
-- still count normally (total_water_drops keeps growing, Rewind stays
-- accurate) — only the DISPLAYED phase is throttled, catching up
-- gradually rather than jumping.
--
-- Also resets every existing user's plant back to phase 0 as requested,
-- as a one-time reset alongside introducing the new pacing rule.

ALTER TABLE plant_progress
  ADD COLUMN displayed_phase INT NOT NULL DEFAULT 0 CHECK (displayed_phase BETWEEN 0 AND 7),
  ADD COLUMN phase_advanced_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- One-time reset: every plant goes back to phase 0, with the 2-day timer
-- starting fresh from now. total_water_drops is left untouched so nothing
-- already earned is lost — it will just take a little while to "catch up"
-- visually under the new one-phase-per-two-days pace.
UPDATE plant_progress
SET displayed_phase = 0,
    phase_advanced_at = NOW();

-- Given a user's plant_progress row, returns the phase that should
-- currently be DISPLAYED: the stored displayed_phase, advanced by at most
-- one step for each full 2-day period that has elapsed since
-- phase_advanced_at, capped by how far total_water_drops actually
-- justifies (via the same thresholds as lib/plants.ts's PHASE_THRESHOLDS).
CREATE OR REPLACE FUNCTION settle_plant_phase(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress        plant_progress%ROWTYPE;
  v_earned_phase    INT;
  v_days_elapsed    INT;
  v_steps_allowed   INT;
  v_new_phase       INT;
  thresholds INT[] := ARRAY[0, 10, 25, 50, 90, 140, 200, 280];
  i INT;
BEGIN
  SELECT * INTO v_progress
  FROM plant_progress
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'plant_progress_not_found'; END IF;

  -- Highest phase the raw drop total actually justifies.
  v_earned_phase := 0;
  FOR i IN 1..array_length(thresholds, 1) LOOP
    IF v_progress.total_water_drops >= thresholds[i] THEN
      v_earned_phase := i - 1;
    END IF;
  END LOOP;

  -- How many 2-day windows have fully elapsed since the last advance.
  v_days_elapsed := FLOOR(EXTRACT(EPOCH FROM (NOW() - v_progress.phase_advanced_at)) / 86400);
  v_steps_allowed := FLOOR(v_days_elapsed / 2.0);

  v_new_phase := LEAST(v_progress.displayed_phase + v_steps_allowed, v_earned_phase, 7);

  IF v_new_phase > v_progress.displayed_phase THEN
    UPDATE plant_progress
    SET displayed_phase = v_new_phase,
        phase_advanced_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object('displayed_phase', v_new_phase, 'earned_phase', v_earned_phase);
END;
$$;
