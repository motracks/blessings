-- Structured check-in data model.
--
-- Replaces the ad-hoc morning question columns on daily_checkins
-- (sleep_quality, hydration, mental_load) with a proper long-format
-- schema: one checkins row per user/period/day, one checkin_responses
-- row per answered question. daily_checkins stays as-is for the habit
-- tiles, steps, and energy_level (which still drives task generation and
-- the complete_task multiplier); this migration does not touch it.
--
-- Adds three new questions to the existing three, all on the same 1-6
-- scale: morning = sleep, self_kindness, mental_load;
-- evening = engagement, connection, identity.
--
-- Deviations from the handover spec, deliberate:
--   * checkins carries a `date` column (default CURRENT_DATE) plus a
--     UNIQUE (user_id, period, date). The app is day-oriented and every
--     sibling table (daily_checkins, evening_wrapups) keys on
--     (user_id, date); without it "one check-in per period" has no
--     natural key and re-opening the page would stack rows. submit_checkin
--     upserts on this key.
--   * FKs point at profiles(id), not auth.users, matching daily_checkins
--     and the rest of the schema (profiles.id is itself FK'd to
--     auth.users ON DELETE CASCADE).
--
-- Constraints carried over from the spec, do not optimize around:
--   * No aggregate / composite "mood score" anywhere. Domains stay
--     independent throughout.
--   * Question text lives only in checkin_questions. Response rows store
--     question_key (+ server-derived domain/period), never the text.
--   * If question wording changes later, insert the OUTGOING text into
--     checkin_question_history BEFORE updating checkin_questions. This is
--     the only historical record of what was actually asked. There is no
--     text-mutation path in any RPC here; wording changes are done by
--     migration and must follow this rule.

-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('morning', 'evening')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, period, date)
);

CREATE TABLE checkin_questions (
  question_key TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('morning', 'evening')),
  text_en TEXT NOT NULL,
  text_de TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE checkin_question_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_key TEXT NOT NULL REFERENCES checkin_questions(question_key),
  text_en TEXT NOT NULL,
  text_de TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE checkin_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL REFERENCES checkin_questions(question_key),
  domain TEXT NOT NULL,
  period TEXT NOT NULL,
  value SMALLINT NOT NULL CHECK (value BETWEEN 1 AND 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX idx_checkin_responses_user_domain_created
  ON checkin_responses (user_id, domain, created_at);

CREATE INDEX idx_checkin_responses_user_checkin
  ON checkin_responses (user_id, checkin_id);

-- ============================================================
-- 3. SEED QUESTIONS
-- ============================================================

INSERT INTO checkin_questions (question_key, domain, period, text_en, text_de) VALUES
  ('sleep',         'sleep',         'morning', 'How restful was your sleep?',                        'Wie erholsam war dein Schlaf?'),
  ('self_kindness', 'self_kindness', 'morning', 'How kind have you been with yourself today?',        'Wie liebevoll bist du heute mit dir selbst umgegangen?'),
  ('mental_load',   'mental_load',   'morning', 'How full does your head feel today?',                'Wie voll fühlt sich dein Kopf heute an?'),
  ('engagement',    'engagement',    'evening', 'How interested did you feel today?',                 'Wie interessiert hast du dich heute gefühlt?'),
  ('connection',    'connection',    'evening', 'How connected did you feel with others today?',      'Wie verbunden hast du dich heute mit anderen gefühlt?'),
  ('identity',      'identity',      'evening', 'How much did you feel like yourself today?',         'Wie sehr hast du dich heute wie du selbst gefühlt?');

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE checkins             ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_questions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_responses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_question_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own checkins rows" ON checkins
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "admin read checkins rows" ON checkins
  FOR SELECT USING (is_admin());

CREATE POLICY "own checkin responses" ON checkin_responses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "admin read checkin responses" ON checkin_responses
  FOR SELECT USING (is_admin());

-- Question catalogue: any authenticated user can read active/inactive
-- alike (the client filters to active); nobody writes via the client.
CREATE POLICY "read checkin questions" ON checkin_questions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- History is an audit log; admin-only read, no client writes.
CREATE POLICY "admin read question history" ON checkin_question_history
  FOR SELECT USING (is_admin());

-- ============================================================
-- 5. SUBMISSION RPC
-- ============================================================

-- submit_checkin(checkin_period, responses)
--
-- responses is a JSON array of { "question_key": text, "value": int }.
-- The client never sends domain or period per response - the function
-- derives both server-side from checkin_questions and ignores anything
-- else in the payload.
--
-- Atomic (single function body): upserts the owning checkins row for
-- today/this period, sets completed_at, replaces that check-in's
-- response rows. Validates the submitted set is exactly the active
-- question set for the period before writing anything.
CREATE OR REPLACE FUNCTION submit_checkin(
  checkin_period TEXT,
  responses JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_checkin_id  UUID;
  v_expected    TEXT[];
  v_submitted   TEXT[];
  v_count       INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF checkin_period NOT IN ('morning', 'evening') THEN
    RAISE EXCEPTION 'invalid_period';
  END IF;

  IF jsonb_typeof(responses) <> 'array' THEN
    RAISE EXCEPTION 'invalid_responses';
  END IF;

  -- Active question keys expected for this period.
  SELECT array_agg(question_key ORDER BY question_key) INTO v_expected
  FROM checkin_questions
  WHERE period = checkin_period AND active = TRUE;

  -- Keys the client submitted (sorted, de-duplicated).
  SELECT array_agg(DISTINCT elem->>'question_key' ORDER BY elem->>'question_key')
    INTO v_submitted
  FROM jsonb_array_elements(responses) AS elem;

  IF v_submitted IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'incomplete_or_invalid_response_set';
  END IF;

  -- Every value must be an integer in 1..6.
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(responses) AS elem
    WHERE NOT ((elem->>'value') ~ '^[1-6]$')
  ) THEN
    RAISE EXCEPTION 'invalid_value';
  END IF;

  -- Upsert the owning check-in for today / this period.
  INSERT INTO checkins (user_id, period, date, completed_at)
  VALUES (v_user_id, checkin_period, CURRENT_DATE, NOW())
  ON CONFLICT (user_id, period, date)
  DO UPDATE SET completed_at = NOW()
  RETURNING id INTO v_checkin_id;

  -- Replace this check-in's responses.
  DELETE FROM checkin_responses WHERE checkin_id = v_checkin_id;

  INSERT INTO checkin_responses
    (user_id, checkin_id, question_key, domain, period, value)
  SELECT
    v_user_id,
    v_checkin_id,
    q.question_key,
    q.domain,
    q.period,
    (elem->>'value')::SMALLINT
  FROM jsonb_array_elements(responses) AS elem
  JOIN checkin_questions q ON q.question_key = elem->>'question_key';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'checkin_id', v_checkin_id,
    'count', v_count
  );
END;
$$;
