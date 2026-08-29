'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { EveningWrapup } from '@/lib/types';

interface AbendSectionProps {
  today: string;
  yesterday: string;
  userId: string;
  wrapup: EveningWrapup | null;
  yesterdayWrapup: EveningWrapup | null;
  onWrapupUpdated: (wrapup: EveningWrapup) => void;
  onYesterdayWrapupUpdated: (wrapup: EveningWrapup) => void;
}

export function AbendSection({
  today,
  yesterday,
  userId,
  wrapup,
  yesterdayWrapup,
  onWrapupUpdated,
  onYesterdayWrapupUpdated,
}: AbendSectionProps) {
  const [journalEntry, setJournalEntry] = useState(wrapup?.journal_entry ?? '');
  const [tomorrowGoal, setTomorrowGoal] = useState(wrapup?.tomorrow_goal ?? '');
  const [savingJournal, setSavingJournal] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [journalSaved, setJournalSaved] = useState(false);
  const [goalSaved, setGoalSaved] = useState(false);
  const [yesterdayGoalSaving, setYesterdayGoalSaving] = useState(false);
  const [yesterdayGoalError, setYesterdayGoalError] = useState(false);

  async function upsertWrapup(fields: Partial<EveningWrapup>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('evening_wrapups')
      .upsert(
        { user_id: userId, date: today, ...fields },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single();
    return { data, error };
  }

  async function handleSaveJournal() {
    setSavingJournal(true);
    setJournalSaved(false);
    const { data, error } = await upsertWrapup({
      journal_entry: journalEntry,
      journal_visibility: 'private',
    });
    if (!error && data) {
      onWrapupUpdated(data);
      setJournalSaved(true);
    }
    setSavingJournal(false);
  }

  async function handleSaveGoal() {
    setSavingGoal(true);
    setGoalSaved(false);
    const { data, error } = await upsertWrapup({
      tomorrow_goal: tomorrowGoal,
      goal_visibility: 'private',
    });
    if (!error && data) {
      onWrapupUpdated(data);
      setGoalSaved(true);
    }
    setSavingGoal(false);
  }

  async function handleYesterdayGoalDone() {
    if (yesterdayGoalSaving || !yesterdayWrapup || yesterdayWrapup.goal_completed) return;
    setYesterdayGoalSaving(true);
    setYesterdayGoalError(false);
    const supabase = createClient();
    const { error } = await supabase.rpc('award_goal_completed', {
      p_user_id: userId,
      p_date: yesterday,
    });
    if (error) {
      setYesterdayGoalError(true);
    } else {
      onYesterdayWrapupUpdated({ ...yesterdayWrapup, goal_completed: true });
    }
    setYesterdayGoalSaving(false);
  }

  const showYesterdayGoal = !!yesterdayWrapup?.tomorrow_goal;

  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      <div>
        <p className="mb-3 text-center text-sm text-text-muted">How was your day?</p>
        <textarea
          value={journalEntry}
          onChange={(e) => {
            setJournalEntry(e.target.value);
            setJournalSaved(false);
          }}
          rows={3}
          placeholder="Write as much or as little as you like…"
          className="w-full rounded-3xl border border-tile-idle-border bg-tile-idle px-5 py-4 text-sm text-text placeholder:text-text-muted outline-none focus:border-accent transition-all duration-300"
        />
        <SaveButton
          onClick={handleSaveJournal}
          disabled={savingJournal || !journalEntry.trim()}
          saving={savingJournal}
          saved={journalSaved}
          idleLabel="Save"
        />
      </div>

      {showYesterdayGoal && (
        <div className="rounded-3xl border border-tile-done-border bg-tile-done px-6 py-5 text-center">
          <p className="mb-2 text-sm text-text-muted">Yesterday&apos;s goal</p>
          <p className="mb-4 text-sm text-text">&ldquo;{yesterdayWrapup!.tomorrow_goal}&rdquo;</p>
          {yesterdayWrapup!.goal_completed ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-text">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.8"
              >
                <polyline points="4,12 10,18 20,6" />
              </svg>
              Done
            </span>
          ) : (
            <button
              onClick={handleYesterdayGoalDone}
              disabled={yesterdayGoalSaving}
              className="min-h-[44px] rounded-full bg-accent px-6 py-2 text-sm text-accent-contrast transition-all duration-300 disabled:opacity-60"
            >
              {yesterdayGoalSaving ? 'Saving…' : 'Mark as done'}
            </button>
          )}
          {yesterdayGoalError && (
            <p className="mt-2 text-sm text-text-muted">
              That did not work. Please try again.
            </p>
          )}
        </div>
      )}

      <div>
        <p className="mb-3 text-center text-sm text-text-muted">
          What would be a gentle goal for tomorrow?
        </p>
        <textarea
          value={tomorrowGoal}
          onChange={(e) => {
            setTomorrowGoal(e.target.value);
            setGoalSaved(false);
          }}
          rows={3}
          placeholder="Something small and kind…"
          className="w-full rounded-3xl border border-tile-idle-border bg-tile-idle px-5 py-4 text-sm text-text placeholder:text-text-muted outline-none focus:border-accent transition-all duration-300"
        />
        <SaveButton
          onClick={handleSaveGoal}
          disabled={savingGoal || !tomorrowGoal.trim()}
          saving={savingGoal}
          saved={goalSaved}
          idleLabel="Save"
        />
      </div>
    </div>
  );
}

function SaveButton({
  onClick,
  disabled,
  saving,
  saved,
  idleLabel,
}: {
  onClick: () => void;
  disabled: boolean;
  saving: boolean;
  saved: boolean;
  idleLabel: string;
}) {
  return (
    <div className="mt-3 flex justify-end">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`min-h-[36px] rounded-full border px-5 text-sm transition-all duration-300 disabled:opacity-50 ${
          saved
            ? 'border-tile-done-border bg-tile-done text-text'
            : 'border-primary bg-transparent text-primary'
        }`}
      >
        {saving ? 'Saving…' : saved ? 'Saved' : idleLabel}
      </button>
    </div>
  );
}
