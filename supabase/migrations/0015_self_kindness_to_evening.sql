-- Move the self_kindness question from the morning to the evening
-- check-in. Only its period changes; the wording is unchanged, so no
-- checkin_question_history row is written (that audit table records
-- text changes only). domain stays 'self_kindness'.
--
-- submit_checkin derives period server-side from checkin_questions, so
-- no application change is needed for validation — the evening set
-- becomes {engagement, connection, identity, self_kindness} and the
-- morning set becomes {sleep, mental_load}.

UPDATE checkin_questions
SET period = 'evening'
WHERE question_key = 'self_kindness';
