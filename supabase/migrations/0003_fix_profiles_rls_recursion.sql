-- Fix: "admin read profiles" policy queried `profiles` from within a
-- `profiles` policy, causing "infinite recursion detected in policy for
-- relation profiles" (Postgres error 42P17). This broke every operation
-- touching profiles, daily_checkins, tasks, and evening_wrapups, since
-- their admin-read policies all query profiles for the role check.
--
-- Fix: a SECURITY DEFINER helper function bypasses RLS when checking the
-- caller's role, breaking the recursion.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "admin read profiles" ON profiles;
CREATE POLICY "admin read profiles" ON profiles
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "admin read checkins" ON daily_checkins;
CREATE POLICY "admin read checkins" ON daily_checkins
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "admin read tasks" ON tasks;
CREATE POLICY "admin read tasks" ON tasks
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "admin read shared journal" ON evening_wrapups;
CREATE POLICY "admin read shared journal" ON evening_wrapups
  FOR SELECT USING (is_admin() AND journal_visibility = 'shared');
