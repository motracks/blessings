-- Admin read support for Step 7 (/admin).
--
-- Problem 1: the existing "admin read shared journal" RLS policy on
-- evening_wrapups only exposes a row when journal_visibility = 'shared'.
-- A user who shares only their tomorrow_goal (goal_visibility = 'shared',
-- journal_visibility = 'private') would have that row fully hidden from
-- admin — the spec requires shared goals to be visible independently of
-- the journal's visibility.
--
-- Problem 2 (more serious): RLS is row-level, not column-level. Even for
-- rows the policy already allows through (because the journal is shared),
-- a private tomorrow_goal on that same row would still be returned by a
-- plain `select *` — silently leaking a private goal to admin any time
-- the journal happened to be shared. The reverse leak (private journal
-- exposed because the goal is shared) has the same bug.
--
-- Fix: widen the RLS policy so a row is visible if *either* field is
-- shared (needed so admin can query the table at all), and add a
-- SECURITY DEFINER RPC that the admin UI calls instead of querying the
-- table directly. The RPC nulls out whichever field is not marked shared,
-- so a private journal or private goal is never returned to admin even
-- when its sibling column is a shared row.
--
-- Also adds a SECURITY DEFINER RPC to list all profiles for the admin
-- user picker — the "own profile" RLS policy on profiles is `auth.uid()
-- = id`, which means a plain client-side `select * from profiles` as
-- admin only returns the admin's own row for any columns not covered by
-- an admin-read policy; profiles IS covered by "admin read profiles" for
-- SELECT, so a plain select actually works today, but we still centralize
-- it in an RPC so future column additions to profiles can't accidentally
-- leak through an admin listing without deliberate review.

DROP POLICY IF EXISTS "admin read shared journal" ON evening_wrapups;
CREATE POLICY "admin read shared wrapups" ON evening_wrapups
  FOR SELECT USING (
    is_admin() AND (journal_visibility = 'shared' OR goal_visibility = 'shared')
  );

CREATE OR REPLACE FUNCTION admin_list_profiles()
RETURNS TABLE (
  id UUID,
  role TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id, p.role, p.created_at
  FROM profiles p
  WHERE is_admin()
  ORDER BY p.created_at ASC;
$$;

CREATE OR REPLACE FUNCTION admin_list_checkins()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  date DATE,
  energy_level INT,
  sleep_quality INT,
  hydration INT,
  mental_load INT,
  steps_done BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT c.id, c.user_id, c.date, c.energy_level, c.sleep_quality,
         c.hydration, c.mental_load, c.steps_done
  FROM daily_checkins c
  WHERE is_admin()
  ORDER BY c.date DESC;
$$;

CREATE OR REPLACE FUNCTION admin_list_completed_tasks()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  date DATE,
  type TEXT,
  description TEXT,
  completed_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT t.id, t.user_id, t.date, t.type, t.description, t.completed_at
  FROM tasks t
  WHERE is_admin() AND t.is_completed = TRUE
  ORDER BY t.date DESC;
$$;

-- Returns only the columns that are actually marked shared; the sibling
-- private field is always NULL in the result, regardless of what's in
-- the underlying row. This is the only entry point the admin UI should
-- use to read evening_wrapups.
CREATE OR REPLACE FUNCTION admin_list_shared_wrapups()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  date DATE,
  journal_entry TEXT,
  tomorrow_goal TEXT,
  goal_completed BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    w.id,
    w.user_id,
    w.date,
    CASE WHEN w.journal_visibility = 'shared' THEN w.journal_entry ELSE NULL END,
    CASE WHEN w.goal_visibility = 'shared' THEN w.tomorrow_goal ELSE NULL END,
    w.goal_completed
  FROM evening_wrapups w
  WHERE is_admin()
    AND (w.journal_visibility = 'shared' OR w.goal_visibility = 'shared')
  ORDER BY w.date DESC;
$$;
