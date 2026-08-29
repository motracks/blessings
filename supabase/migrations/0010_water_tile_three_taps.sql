-- Converts the "Enough Water" tile from a single boolean into a 3-tap
-- counter (matching the new design's 3-dot progress indicator). Each tap
-- awards 2 water drops, same per-tap reward as the other habit tiles.

ALTER TABLE daily_checkins
  ADD COLUMN water_count INT NOT NULL DEFAULT 0 CHECK (water_count BETWEEN 0 AND 3);

-- Backfill: a previously-completed water_done maps to a full 3/3 count so
-- existing users don't lose visible progress.
UPDATE daily_checkins SET water_count = 3 WHERE water_done = TRUE;

CREATE OR REPLACE FUNCTION award_water(
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
  v_new_count   INT;
BEGIN
  SELECT * INTO v_checkin
  FROM daily_checkins
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'checkin_not_found'; END IF;
  IF v_checkin.water_count >= 3 THEN RAISE EXCEPTION 'water_already_awarded'; END IF;

  v_new_count := v_checkin.water_count + 1;

  UPDATE daily_checkins
  SET water_count = v_new_count,
      water_done = (v_new_count >= 3),
      updated_at = NOW()
  WHERE user_id = p_user_id AND date = p_date;

  INSERT INTO water_drop_events
    (user_id, source, base_points, multiplier, awarded_points)
  VALUES
    (p_user_id, 'water', 2, 1.0, 2);

  UPDATE plant_progress
  SET total_water_drops = total_water_drops + 2,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  SELECT total_water_drops INTO v_new_total
  FROM plant_progress WHERE user_id = p_user_id;

  RETURN jsonb_build_object('awarded', 2, 'new_total', v_new_total, 'water_count', v_new_count);
END;
$$;
