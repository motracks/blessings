-- Flip the mental_load question so a high score means a good day, matching
-- every other check-in scale (sleep, engagement, connection, identity,
-- self_kindness all read 1 = "not at all" / 6 = the positive end).
--
-- Before: "How full does your head feel today?" — 1 clear ... 6 overflowing
--         (6 = the BAD end, inverse of every other domain — a data-model
--          trap for anyone comparing domains).
-- After:  "How clear does your head feel today?" — 1 ... 6 = clear.
--
-- domain and question_key are unchanged (still 'mental_load'); only the
-- wording changes. Per the audit rule, the OUTGOING text is written to
-- checkin_question_history BEFORE checkin_questions is updated.
--
-- Existing checkin_responses rows are NOT rewritten: they were answered
-- against the old wording and their meaning is recorded by the history
-- row below. If you need a directionally-consistent series across the
-- wording change, invert pre-cutover values in analysis using
-- checkin_question_history.changed_at as the boundary.

INSERT INTO checkin_question_history (question_key, text_en, text_de)
SELECT question_key, text_en, text_de
FROM checkin_questions
WHERE question_key = 'mental_load';

UPDATE checkin_questions
SET
  text_en = 'How clear does your head feel today?',
  text_de = 'Wie klar fühlt sich dein Kopf heute an?'
WHERE question_key = 'mental_load';
