-- Lets a habit tile be un-done if it was tapped by accident.
--
-- Each award_<habit> RPC sets a *_done flag on daily_checkins, inserts a
-- water_drop_events row, and adds its awarded_points to
-- plant_progress.total_water_drops. undo_habit reverses exactly that for
-- one habit on one day:
--   * clears the *_done flag
--   * deletes the most recent matching water_drop_events row for that
--     user / source / day
--   * subtracts that row's awarded_points from total_water_drops (never
--     below zero)
--
-- One generic function rather than 12 unaward_<habit> functions: the
-- habit -> (column, source) mapping lives in a single place here.
--
-- Note: water_drop_events has no date column, so "today's" event is
-- matched on created_at::date = p_date. Same local-vs-UTC caveat as the
-- rest of the app; acceptable for undoing an accidental tap.
--
-- displayed_phase is deliberately NOT touched — settle_plant_phase only
-- ever advances the visible phase and is naturally re-clamped against the
-- lower total on the next home load.

CREATE OR REPLACE FUNCTION undo_habit(
  p_user_id UUID,
  p_date DATE,
  p_habit TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_column      TEXT;
  v_source      TEXT;
  v_is_done     BOOLEAN;
  v_event_id    UUID;
  v_points      INT;
  v_new_total   INT;
BEGIN
  -- habit -> (daily_checkins column, water_drop_events.source)
  CASE p_habit
    WHEN 'water'      THEN v_column := 'water_done';      v_source := 'water';
    WHEN 'steps'      THEN v_column := 'steps_done';      v_source := 'steps';
    WHEN 'shower'     THEN v_column := 'shower_done';     v_source := 'shower';
    WHEN 'outside'    THEN v_column := 'outside_done';    v_source := 'outside';
    WHEN 'meal1'      THEN v_column := 'meal1_done';      v_source := 'meal1';
    WHEN 'meal2'      THEN v_column := 'meal2_done';      v_source := 'meal2';
    WHEN 'journaling' THEN v_column := 'journaling_done'; v_source := 'journaling';
    WHEN 'reading'    THEN v_column := 'reading_done';    v_source := 'reading';
    WHEN 'praying'    THEN v_column := 'praying_done';    v_source := 'praying';
    WHEN 'meditating' THEN v_column := 'meditating_done'; v_source := 'meditating';
    WHEN 'writing'    THEN v_column := 'writing_done';    v_source := 'writing';
    WHEN 'creativity' THEN v_column := 'creativity_done'; v_source := 'creativity';
    ELSE RAISE EXCEPTION 'unknown_habit';
  END CASE;

  -- Lock the day's check-in row and read the current flag.
  EXECUTE format(
    'SELECT %I FROM daily_checkins WHERE user_id = $1 AND date = $2 FOR UPDATE',
    v_column
  ) INTO v_is_done USING p_user_id, p_date;

  IF v_is_done IS NULL THEN RAISE EXCEPTION 'checkin_not_found'; END IF;
  IF NOT v_is_done   THEN RAISE EXCEPTION 'not_awarded'; END IF;

  -- Clear the flag.
  EXECUTE format(
    'UPDATE daily_checkins SET %I = FALSE, updated_at = NOW() WHERE user_id = $1 AND date = $2',
    v_column
  ) USING p_user_id, p_date;

  -- Remove one matching drop event for that day and reclaim its points.
  SELECT id, awarded_points INTO v_event_id, v_points
  FROM water_drop_events
  WHERE user_id = p_user_id
    AND source = v_source
    AND created_at::date = p_date
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_event_id IS NOT NULL THEN
    DELETE FROM water_drop_events WHERE id = v_event_id;

    UPDATE plant_progress
    SET total_water_drops = GREATEST(total_water_drops - v_points, 0),
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  SELECT total_water_drops INTO v_new_total
  FROM plant_progress WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'removed', COALESCE(v_points, 0),
    'new_total', v_new_total
  );
END;
$$;
