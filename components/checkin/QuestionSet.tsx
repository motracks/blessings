'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CheckinPeriod, CheckinQuestion, CheckinResponse } from '@/lib/types';

interface QuestionSetProps {
  period: CheckinPeriod;
  questions: CheckinQuestion[];
  responses: CheckinResponse[];
  onSubmitted: (responses: CheckinResponse[]) => void;
}

// Endpoint captions shown under the 1 and 6 buttons. Only the poles are
// labelled; 2-5 stay as bare numbers to keep the row uncluttered.
const SCALE_ENDPOINTS: Record<string, { low: string; high: string }> = {
  sleep: { low: 'not restful', high: 'deeply restful' },
  mental_load: { low: 'not at all', high: 'clear' },
  engagement: { low: 'not at all', high: 'completely' },
  connection: { low: 'not at all', high: 'completely' },
  identity: { low: 'not at all', high: 'completely' },
  self_kindness: { low: 'not at all', high: 'completely' },
};
const DEFAULT_ENDPOINTS = { low: 'not at all', high: 'completely' };

export function QuestionSet({ period, questions, responses, onSubmitted }: QuestionSetProps) {
  const initial: Record<string, number> = {};
  for (const r of responses) initial[r.question_key] = r.value;

  const [values, setValues] = useState<Record<string, number>>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(responses.length > 0);
  const [error, setError] = useState(false);

  const allAnswered = questions.every((q) => values[q.question_key] != null);

  async function handleSubmit() {
    if (saving || !allAnswered) return;
    setSaving(true);
    setError(false);

    const supabase = createClient();
    const payload = questions.map((q) => ({
      question_key: q.question_key,
      value: values[q.question_key],
    }));

    const { data, error: rpcError } = await supabase.rpc('submit_checkin', {
      checkin_period: period,
      responses: payload,
    });

    if (rpcError || !data) {
      setError(true);
      setSaving(false);
      return;
    }

    const checkinId = (data as { checkin_id: string }).checkin_id;
    const now = new Date().toISOString();
    onSubmitted(
      questions.map((q) => ({
        id: '',
        user_id: responses[0]?.user_id ?? '',
        checkin_id: checkinId,
        question_key: q.question_key,
        domain: q.domain,
        period: q.period,
        value: values[q.question_key],
        created_at: now,
      }))
    );
    setSaved(true);
    setSaving(false);
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      {questions.map((q) => (
        <Scale
          key={q.question_key}
          label={q.text_en}
          endpoints={SCALE_ENDPOINTS[q.question_key] ?? DEFAULT_ENDPOINTS}
          value={values[q.question_key] ?? null}
          disabled={saving}
          onSelect={(v) => {
            setValues((prev) => ({ ...prev, [q.question_key]: v }));
            setSaved(false);
          }}
        />
      ))}

      <div className="flex flex-col items-end gap-2">
        <button
          onClick={handleSubmit}
          disabled={saving || !allAnswered}
          className={`min-h-[36px] rounded-full border px-5 text-sm transition-all duration-300 disabled:opacity-50 ${
            saved
              ? 'border-tile-done-border bg-tile-done text-text'
              : 'border-primary bg-transparent text-primary'
          }`}
        >
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
        </button>
        {error && (
          <p className="text-sm text-text-muted">That did not work. Please try again.</p>
        )}
      </div>
    </div>
  );
}

function Scale({
  label,
  endpoints,
  value,
  disabled,
  onSelect,
}: {
  label: string;
  endpoints: { low: string; high: string };
  value: number | null;
  disabled: boolean;
  onSelect: (v: number) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-center text-sm text-text-muted">{label}</p>
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4, 5, 6].map((level) => {
          const isSelected = value === level;
          const endpointLabel =
            level === 1 ? endpoints.low : level === 6 ? endpoints.high : null;
          return (
            <button
              key={level}
              onClick={() => onSelect(level)}
              disabled={disabled}
              aria-label={endpointLabel ? `${level} — ${endpointLabel}` : String(level)}
              style={{ width: 40, height: 40 }}
              className={`flex shrink-0 items-center justify-center rounded-full border text-sm transition-all duration-300 disabled:opacity-60 ${
                isSelected
                  ? 'border-tile-done-border bg-tile-done text-text'
                  : 'border-tile-idle-border bg-tile-idle text-text-muted'
              }`}
            >
              {level}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between px-1 text-[11px] text-text-soft">
        <span>{endpoints.low}</span>
        <span>{endpoints.high}</span>
      </div>
    </div>
  );
}
