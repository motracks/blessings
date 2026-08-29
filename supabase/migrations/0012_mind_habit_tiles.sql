-- Adds four Mind habit tiles: journaling_done, reading_done, praying_done,
-- meditating_done. Same pattern as the existing Body/Soul tiles — a
-- same-day, one-time boolean flag on daily_checkins, awarding a fixed 2
-- water drops via its own idempotent RPC.

ALTER TABLE daily_checkins
  ADD COLUMN journaling_done BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN reading_done BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN praying_done BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN meditating_done BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION award_journaling(
  p_user_id UUID,
  p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkin     daily_checkins%ROWTYPE;
  v_new_total   INT;
BEGIN
  SELECT * INTO v_checkin
  FROM daily_checkins
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'checkin_not_found'; END IF;
  IF v_checkin.journaling_done THEN RAISE EXCEPTION 'journaling_already_awarded'; END IF;

  UPDATE daily_checkins
  SET journaling_done = TRUE, updated_at = NOW()
  WHERE user_id = p_user_id AND date = p_date;

  INSERT INTO water_drop_events
    (user_id, source, base_points, multiplier, awarded_points)
  VALUES
    (p_user_id, 'journaling', 2, 1.0, 2);

  UPDATE plant_progress
  SET total_water_drops = total_water_drops + 2,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  SELECT total_water_drops INTO v_new_total
  FROM plant_progress WHERE user_id = p_user_id;

  RETURN jsonb_build_object('awarded', 2, 'new_total', v_new_total);
END;
$$;

CREATE OR REPLACE FUNCTION award_reading(
  p_user_id UUID,
  p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkin     daily_checkins%ROWTYPE;
  v_new_total   INT;
BEGIN
  SELECT * INTO v_checkin
  FROM daily_checkins
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'checkin_not_found'; END IF;
  IF v_checkin.reading_done THEN RAISE EXCEPTION 'reading_already_awarded'; END IF;

  UPDATE daily_checkins
  SET reading_done = TRUE, updated_at = NOW()
  WHERE user_id = p_user_id AND date = p_date;

  INSERT INTO water_drop_events
    (user_id, source, base_points, multiplier, awarded_points)
  VALUES
    (p_user_id, 'reading', 2, 1.0, 2);

  UPDATE plant_progress
  SET total_water_drops = total_water_drops + 2,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  SELECT total_water_drops INTO v_new_total
  FROM plant_progress WHERE user_id = p_user_id;

  RETURN jsonb_build_object('awarded', 2, 'new_total', v_new_total);
END;
$$;

CREATE OR REPLACE FUNCTION award_praying(
  p_user_id UUID,
  p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkin     daily_checkins%ROWTYPE;
  v_new_total   INT;
BEGIN
  SELECT * INTO v_checkin
  FROM daily_checkins
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'checkin_not_found'; END IF;
  IF v_checkin.praying_done THEN RAISE EXCEPTION 'praying_already_awarded'; END IF;

  UPDATE daily_checkins
  SET praying_done = TRUE, updated_at = NOW()
  WHERE user_id = p_user_id AND date = p_date;

  INSERT INTO water_drop_events
    (user_id, source, base_points, multiplier, awarded_points)
  VALUES
    (p_user_id, 'praying', 2, 1.0, 2);

  UPDATE plant_progress
  SET total_water_drops = total_water_drops + 2,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  SELECT total_water_drops INTO v_new_total
  FROM plant_progress WHERE user_id = p_user_id;

  RETURN jsonb_build_object('awarded', 2, 'new_total', v_new_total);
END;
$$;

CREATE OR REPLACE FUNCTION award_meditating(
  p_user_id UUID,
  p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkin     daily_checkins%ROWTYPE;
  v_new_total   INT;
BEGIN
  SELECT * INTO v_checkin
  FROM daily_checkins
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'checkin_not_found'; END IF;
  IF v_checkin.meditating_done THEN RAISE EXCEPTION 'meditating_already_awarded'; END IF;

  UPDATE daily_checkins
  SET meditating_done = TRUE, updated_at = NOW()
  WHERE user_id = p_user_id AND date = p_date;

  INSERT INTO water_drop_events
    (user_id, source, base_points, multiplier, awarded_points)
  VALUES
    (p_user_id, 'meditating', 2, 1.0, 2);

  UPDATE plant_progress
  SET total_water_drops = total_water_drops + 2,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  SELECT total_water_drops INTO v_new_total
  FROM plant_progress WHERE user_id = p_user_id;

  RETURN jsonb_build_object('awarded', 2, 'new_total', v_new_total);
END;
$$;

-- water_drop_events.source CHECK constraint needs to allow the four new
-- source values used above.
ALTER TABLE water_drop_events DROP CONSTRAINT water_drop_events_source_check;
ALTER TABLE water_drop_events ADD CONSTRAINT water_drop_events_source_check
  CHECK (source IN (
    'task', 'steps', 'goal_completed', 'water', 'shower', 'outside',
    'meal1', 'meal2', 'journaling', 'reading', 'praying', 'meditating'
  ));
