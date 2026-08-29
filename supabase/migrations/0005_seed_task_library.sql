-- Starter content for task_library. Gentle, non-judgmental tasks across
-- all four types, with low-energy variants for Energy 1-2 days.
-- Run once in the Supabase SQL Editor.

INSERT INTO task_library (description, type, base_points, is_low_energy, is_active) VALUES
  -- Mobility — normal
  ('Stretch your arms overhead for a few breaths', 'mobility', 2, FALSE, TRUE),
  ('Roll your shoulders back slowly, ten times', 'mobility', 2, FALSE, TRUE),
  ('Gently touch your toes, or as far as feels good', 'mobility', 2, FALSE, TRUE),
  ('Do a few easy neck stretches', 'mobility', 2, FALSE, TRUE),

  -- Mobility — low energy
  ('Roll your shoulders back a few times', 'mobility', 2, TRUE, TRUE),
  ('Gently stretch your neck from side to side', 'mobility', 1, TRUE, TRUE),
  ('Wiggle your fingers and toes for a moment', 'mobility', 1, TRUE, TRUE),

  -- Cardio — normal
  ('Take a short walk around the block', 'cardio', 3, FALSE, TRUE),
  ('Climb a flight of stairs', 'cardio', 2, FALSE, TRUE),
  ('Do ten gentle jumping jacks', 'cardio', 2, FALSE, TRUE),
  ('Dance to one song', 'cardio', 2, FALSE, TRUE),

  -- Cardio — low energy
  ('Stand up and stretch for a moment', 'cardio', 1, TRUE, TRUE),
  ('Walk to the window and look outside', 'cardio', 1, TRUE, TRUE),
  ('Take a slow walk to another room and back', 'cardio', 2, TRUE, TRUE),

  -- Side quest — normal
  ('Water an actual plant, if you have one', 'side_quest', 2, FALSE, TRUE),
  ('Tidy one small corner of a room', 'side_quest', 2, FALSE, TRUE),
  ('Open a window and let in some fresh air', 'side_quest', 1, FALSE, TRUE),
  ('Send a kind message to someone', 'side_quest', 2, FALSE, TRUE),
  ('Step outside for a moment, even briefly', 'side_quest', 2, FALSE, TRUE),

  -- Side quest — low energy
  ('Open a window for some fresh air', 'side_quest', 1, TRUE, TRUE),
  ('Light a candle or turn on a favorite lamp', 'side_quest', 1, TRUE, TRUE),
  ('Put one thing back where it belongs', 'side_quest', 1, TRUE, TRUE),

  -- Micro — normal
  ('Drink a full glass of water', 'micro', 2, FALSE, TRUE),
  ('Take five slow, deep breaths', 'micro', 1, FALSE, TRUE),
  ('Notice three things you can see around you', 'micro', 1, FALSE, TRUE),
  ('Put your phone down for two quiet minutes', 'micro', 2, FALSE, TRUE),

  -- Micro — low energy
  ('Take three slow breaths', 'micro', 1, TRUE, TRUE),
  ('Drink a few sips of water', 'micro', 1, TRUE, TRUE),
  ('Close your eyes for a moment', 'micro', 1, TRUE, TRUE);
