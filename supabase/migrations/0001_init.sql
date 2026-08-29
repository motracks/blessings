-- Blessings — initial schema, RPCs, RLS, and auto-provisioning trigger
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).

-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'coachee' CHECK (role IN ('admin', 'coachee')),
  selected_plant TEXT NOT NULL DEFAULT 'monstera' CHECK (selected_plant IN ('monstera')),
  last_opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE plant_progress (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_water_drops INT NOT NULL DEFAULT 0 CHECK (total_water_drops >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  energy_level INT CHECK (energy_level BETWEEN 1 AND 6),
  sleep_quality INT CHECK (sleep_quality BETWEEN 1 AND 5),
  hydration INT CHECK (hydration BETWEEN 1 AND 4),
  mental_load INT CHECK (mental_load BETWEEN 1 AND 6),
  steps_done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE TABLE task_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mobility', 'cardio', 'side_quest', 'micro')),
  base_points INT NOT NULL DEFAULT 2 CHECK (base_points BETWEEN 1 AND 3),
  is_low_energy BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  library_id UUID REFERENCES task_library(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('mobility', 'cardio', 'side_quest', 'micro', 'custom')),
  description TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  points_value INT NOT NULL DEFAULT 2 CHECK (points_value BETWEEN 1 AND 3),
  source TEXT NOT NULL DEFAULT 'generated' CHECK (source IN ('generated', 'custom')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE evening_wrapups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  journal_entry TEXT,
  journal_visibility TEXT NOT NULL DEFAULT 'private' CHECK (journal_visibility IN ('private', 'shared')),
  tomorrow_goal TEXT,
  goal_visibility TEXT NOT NULL DEFAULT 'private' CHECK (goal_visibility IN ('private', 'shared')),
  goal_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE TABLE water_drop_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id),
  source TEXT NOT NULL CHECK (source IN ('task', 'steps', 'goal_completed')),
  base_points INT NOT NULL,
  multiplier NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  awarded_points INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. RPC FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION complete_task(
  p_task_id UUID,
  p_user_id UUID
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
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

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

CREATE OR REPLACE FUNCTION award_steps(
  p_user_id UUID,
  p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
  IF v_checkin.steps_done THEN RAISE EXCEPTION 'steps_already_awarded'; END IF;

  UPDATE daily_checkins
  SET steps_done = TRUE, updated_at = NOW()
  WHERE user_id = p_user_id AND date = p_date;

  INSERT INTO water_drop_events
    (user_id, source, base_points, multiplier, awarded_points)
  VALUES
    (p_user_id, 'steps', 2, 1.0, 2);

  UPDATE plant_progress
  SET total_water_drops = total_water_drops + 2,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  SELECT total_water_drops INTO v_new_total
  FROM plant_progress WHERE user_id = p_user_id;

  RETURN jsonb_build_object('awarded', 2, 'new_total', v_new_total);
END;
$$;

CREATE OR REPLACE FUNCTION award_goal_completed(
  p_user_id UUID,
  p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wrapup    evening_wrapups%ROWTYPE;
  v_new_total INT;
BEGIN
  SELECT * INTO v_wrapup
  FROM evening_wrapups
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;

  IF NOT FOUND               THEN RAISE EXCEPTION 'wrapup_not_found'; END IF;
  IF v_wrapup.goal_completed THEN RAISE EXCEPTION 'goal_already_awarded'; END IF;
  IF v_wrapup.tomorrow_goal IS NULL THEN RAISE EXCEPTION 'no_goal_set'; END IF;

  UPDATE evening_wrapups
  SET goal_completed = TRUE, updated_at = NOW()
  WHERE user_id = p_user_id AND date = p_date;

  INSERT INTO water_drop_events
    (user_id, source, base_points, multiplier, awarded_points)
  VALUES
    (p_user_id, 'goal_completed', 2, 1.0, 2);

  UPDATE plant_progress
  SET total_water_drops = total_water_drops + 2,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  SELECT total_water_drops INTO v_new_total
  FROM plant_progress WHERE user_id = p_user_id;

  RETURN jsonb_build_object('awarded', 2, 'new_total', v_new_total);
END;
$$;

CREATE OR REPLACE FUNCTION generate_daily_tasks(
  p_user_id UUID,
  p_date DATE,
  p_energy_level INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_count INT;
  v_use_low_energy BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_existing_count
  FROM tasks
  WHERE user_id = p_user_id AND date = p_date AND source = 'generated';

  IF v_existing_count > 0 THEN RETURN; END IF;

  v_use_low_energy := (p_energy_level <= 2);

  INSERT INTO tasks (user_id, library_id, date, type, description, points_value, source)
  SELECT
    p_user_id,
    tl.id,
    p_date,
    tl.type,
    tl.description,
    tl.base_points,
    'generated'
  FROM task_library tl
  WHERE tl.is_active = TRUE
    AND (v_use_low_energy = FALSE OR tl.is_low_energy = TRUE)
  ORDER BY RANDOM()
  LIMIT 2;
END;
$$;

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE evening_wrapups  ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_drop_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_library      ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "admin read profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Plant progress
CREATE POLICY "own plant" ON plant_progress
  FOR ALL USING (auth.uid() = user_id);

-- Daily check-ins
CREATE POLICY "own checkins" ON daily_checkins
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "admin read checkins" ON daily_checkins
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Tasks
CREATE POLICY "own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "admin read tasks" ON tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Evening wrap-ups: coachee owns, admin sees only shared entries
CREATE POLICY "own wrapups" ON evening_wrapups
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "admin read shared journal" ON evening_wrapups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    AND journal_visibility = 'shared'
  );

-- Water drop events
CREATE POLICY "own events" ON water_drop_events
  FOR ALL USING (auth.uid() = user_id);

-- Task library: all authenticated users can read
CREATE POLICY "read task library" ON task_library
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 4. AUTOMATIC PROFILE + PLANT CREATION
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id);
  INSERT INTO plant_progress (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
