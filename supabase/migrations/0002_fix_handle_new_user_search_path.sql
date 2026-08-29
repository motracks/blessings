-- Fix: SECURITY DEFINER functions in Postgres do not inherit the caller's
-- search_path. Without an explicit search_path, handle_new_user() cannot
-- resolve `profiles` / `plant_progress` reliably, causing signup to fail
-- with "Database error saving new user".

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  INSERT INTO public.plant_progress (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;
