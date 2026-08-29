-- Make the water tile a one-time click, matching every other habit tile:
-- a single tap sets water_done and awards a fixed 2 water drops,
-- idempotent.
--
-- The 3-tap design from 0010 was dropped (0010 is now a no-op). This
-- re-states award_water in the current standard shape (SET search_path,
-- water_already_awarded guard) and the frontend drops the 3-dot
-- indicator. There is no water_count column and this does not add one.

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
BEGIN
  SELECT * INTO v_checkin
  FROM daily_checkins
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'checkin_not_found'; END IF;
  IF v_checkin.water_done THEN RAISE EXCEPTION 'water_already_awarded'; END IF;

  UPDATE daily_checkins
  SET water_done = TRUE, updated_at = NOW()
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

  RETURN jsonb_build_object('awarded', 2, 'new_total', v_new_total);
END;
$$;
