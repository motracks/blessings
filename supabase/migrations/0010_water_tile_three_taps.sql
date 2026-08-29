-- SUPERSEDED — intentionally a no-op.
--
-- This migration originally converted the water tile into a 3-tap counter
-- (adding a water_count column and a 3-tap award_water). It was never
-- applied to the production database, and the 3-tap design was later
-- dropped in favour of a one-time click like every other habit tile
-- (see 0018_water_tile_single_tap.sql).
--
-- The body is emptied so a fresh `supabase db push` on a new environment
-- lands directly on the single-tap water tile without adding an unused
-- water_count column or a 3-tap award_water that 0018 would only replace.
-- The file is kept (rather than deleted) so the migration sequence and
-- history stay intact.

SELECT 1;
