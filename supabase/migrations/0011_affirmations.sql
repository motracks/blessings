-- Daily affirmation shown on the home screen below the plant. Plain text
-- only — no astrology/planet tagging (stripped from the source content).

CREATE TABLE affirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE affirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read affirmations" ON affirmations
  FOR SELECT USING (auth.uid() IS NOT NULL);

INSERT INTO affirmations (text) VALUES
  ('You are creating a life full of Magic'),
  ('You are Magic'),
  ('You are Attracting'),
  ('You are Creating'),
  ('You are Love'),
  ('You are on a Path through Love, with Love & Towards Love'),
  ('Love surrounds you, Love within you'),
  ('Go through your day with appreciation, love awareness, trust & positivity'),
  ('Trust that everything you need is within You'),
  ('You are Good, you are Love, you are Enough'),
  ('You are the embodiment of Love, You are radiating Love'),
  ('You are Rooted, you are Grounded, you are Loved, you are Safe, you are Seen'),
  ('Your vision is clear, your heart is open, trust that you are supported on your whole journey'),
  ('The Universe is aligning in your favour'),
  ('You are Strong, you are Powerful, you are Determined'),
  ('You are attracting Love, Adventure & Success'),
  ('You are worthy to receive Peace, Love, Abundance, Success & Prosperity'),
  ('You are receiving Peace, Love, Abundance, Success & Prosperity'),
  ('Everything you put your mind to, everything your heart and soul truly desires will blossom, bloom & turn into Gold'),
  ('There is Gold in the Air, there is Gold everywhere, there is Gold in the Air for You!'),
  ('The universe is still aligning in your favour'),
  ('Be Water "I am Water", be Fire "I am Fire", be Earth "I am Earth", be Wind "I am Wind"'),
  ('Welcome change from a place of Abundance & Love'),
  ('You posses the Power of Visualisation - what you visualise will turn into REALITY');
