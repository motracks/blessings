-- Fix: complete_task looked up today's energy level using Postgres's
-- CURRENT_DATE (the database server's timezone, effectively UTC on
-- Supabase), while the app writes/reads "today" using the user's local
-- browser date everywhere else. For any user west of UTC (e.g. the
-- Americas), local evening hours fall after UTC's midnight rollover, so
-- CURRENT_DATE silently disagreed with the checkin row the user actually
-- wrote that morning — the low-energy 2x multiplier would then fail to
-- apply even on a correctly-recorded low-energy day.
--
-- Fix: accept the caller's local date as an explicit parameter instead of
-- trusting the database's own clock/timezone.

CREATE OR REPLACE FUNCTION complete_task(
  p_task_id UUID,
  p_user_id UUID,
  p_today DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task        tasks%ROWTYPE;
  v_energy      INT;
  v_multiplier  NUMERIC := 1.0;
  v_awarded     INT;
  v_new_total   INT;
BEGIN
  SELECT * INTO v_task
  FROM tasks
  WHERE id = p_task_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND            THEN RAISE EXCEPTION 'task_not_found'; END IF;
  IF v_task.is_completed  THEN RAISE EXCEPTION 'already_completed'; END IF;
  IF v_task.is_dismissed  THEN RAISE EXCEPTION 'task_dismissed'; END IF;

  SELECT energy_level INTO v_energy
  FROM daily_checkins
  WHERE user_id = p_user_id AND date = p_today;

  IF v_energy IS NOT NULL AND v_energy <= 2 THEN
    v_multiplier := 2.0;
  END IF;

  v_awarded := CEIL(v_task.points_value * v_multiplier);

  UPDATE tasks
  SET is_completed = TRUE, completed_at = NOW()
  WHERE id = p_task_id;

  INSERT INTO water_drop_events
    (user_id, task_id, source, base_points, multiplier, awarded_points)
  VALUES
    (p_user_id, p_task_id, 'task', v_task.points_value, v_multiplier, v_awarded);

  UPDATE plant_progress
  SET total_water_drops = total_water_drops + v_awarded,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  SELECT total_water_drops INTO v_new_total
  FROM plant_progress WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'awarded',    v_awarded,
    'new_total',  v_new_total
  );
END;
$$;
