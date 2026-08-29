-- Adds two more daily habit tiles in the Soul section: writing_done
-- ("Writing") and creativity_done ("Creativity"). Same pattern as 0008's
-- meal tiles — a same-day, one-time boolean flag on daily_checkins,
-- awarding a fixed 2 water drops via its own idempotent RPC.

ALTER TABLE daily_checkins
  ADD COLUMN writing_done BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN creativity_done BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION award_writing(
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
  IF v_checkin.writing_done THEN RAISE EXCEPTION 'writing_already_awarded'; END IF;

  UPDATE daily_checkins
  SET writing_done = TRUE, updated_at = NOW()
  WHERE user_id = p_user_id AND date = p_date;

  INSERT INTO water_drop_events
    (user_id, source, base_points, multiplier, awarded_points)
  VALUES
    (p_user_id, 'writing', 2, 1.0, 2);

  UPDATE plant_progress
  SET total_water_drops = total_water_drops + 2,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  SELECT total_water_drops INTO v_new_total
  FROM plant_progress WHERE user_id = p_user_id;

  RETURN jsonb_build_object('awarded', 2, 'new_total', v_new_total);
END;
$$;

CREATE OR REPLACE FUNCTION award_creativity(
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
  IF v_checkin.creativity_done THEN RAISE EXCEPTION 'creativity_already_awarded'; END IF;

  UPDATE daily_checkins
  SET creativity_done = TRUE, updated_at = NOW()
  WHERE user_id = p_user_id AND date = p_date;

  INSERT INTO water_drop_events
    (user_id, source, base_points, multiplier, awarded_points)
  VALUES
    (p_user_id, 'creativity', 2, 1.0, 2);

  UPDATE plant_progress
  SET total_water_drops = total_water_drops + 2,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  SELECT total_water_drops INTO v_new_total
  FROM plant_progress WHERE user_id = p_user_id;

  RETURN jsonb_build_object('awarded', 2, 'new_total', v_new_total);
END;
$$;

-- water_drop_events.source CHECK constraint needs to allow the two new
-- source values used above.
ALTER TABLE water_drop_events DROP CONSTRAINT water_drop_events_source_check;
ALTER TABLE water_drop_events ADD CONSTRAINT water_drop_events_source_check
  CHECK (source IN (
    'task', 'steps', 'goal_completed', 'water', 'shower', 'outside',
    'meal1', 'meal2', 'journaling', 'reading', 'praying', 'meditating',
    'writing', 'creativity'
  ));
