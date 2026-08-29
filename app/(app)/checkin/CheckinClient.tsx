'use client';

import { useEffect, useMemo, useState } from 'react';
import { EnergyPicker } from '@/components/checkin/EnergyPicker';
import { QuestionSet } from '@/components/checkin/QuestionSet';
import { AbendSection } from '@/components/checkin/AbendSection';
import { getLocalDateString } from '@/lib/dates';
import type {
  Checkin,
  CheckinQuestion,
  CheckinResponse,
  DailyCheckin,
  EveningWrapup,
} from '@/lib/types';

type StructuredCheckin = Checkin & { checkin_responses: CheckinResponse[] };

// Display order within each period (keys not listed fall to the end).
const QUESTION_ORDER = [
  'sleep',
  'mental_load',
  'engagement',
  'connection',
  'identity',
  'self_kindness',
];
const orderOf = (key: string) => {
  const i = QUESTION_ORDER.indexOf(key);
  return i === -1 ? QUESTION_ORDER.length : i;
};

interface CheckinClientProps {
  userId: string;
  recentCheckins: DailyCheckin[];
  recentWrapups: EveningWrapup[];
  questions: CheckinQuestion[];
  recentStructuredCheckins: StructuredCheckin[];
}

export function CheckinClient({
  userId,
  recentCheckins,
  recentWrapups,
  questions,
  recentStructuredCheckins,
}: CheckinClientProps) {
  const [today, setToday] = useState<string | null>(null);
  const [yesterday, setYesterday] = useState<string | null>(null);
  const [checkin, setCheckin] = useState<DailyCheckin | null>(null);
  const [wrapup, setWrapup] = useState<EveningWrapup | null>(null);
  const [yesterdayWrapup, setYesterdayWrapup] = useState<EveningWrapup | null>(null);
  const [morningResponses, setMorningResponses] = useState<CheckinResponse[]>([]);
  const [eveningResponses, setEveningResponses] = useState<CheckinResponse[]>([]);

  const morningQuestions = useMemo(
    () =>
      questions
        .filter((q) => q.period === 'morning')
        .sort((a, b) => orderOf(a.question_key) - orderOf(b.question_key)),
    [questions]
  );
  const eveningQuestions = useMemo(
    () =>
      questions
        .filter((q) => q.period === 'evening')
        .sort((a, b) => orderOf(a.question_key) - orderOf(b.question_key)),
    [questions]
  );

  useEffect(() => {
    const now = new Date();
    const todayStr = getLocalDateString(now);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterdayDate);

    setToday(todayStr);
    setYesterday(yesterdayStr);
    setCheckin(recentCheckins.find((c) => c.date === todayStr) ?? null);
    setWrapup(recentWrapups.find((w) => w.date === todayStr) ?? null);
    setYesterdayWrapup(recentWrapups.find((w) => w.date === yesterdayStr) ?? null);

    const todaysMorning = recentStructuredCheckins.find(
      (c) => c.date === todayStr && c.period === 'morning'
    );
    const todaysEvening = recentStructuredCheckins.find(
      (c) => c.date === todayStr && c.period === 'evening'
    );
    setMorningResponses(todaysMorning?.checkin_responses ?? []);
    setEveningResponses(todaysEvening?.checkin_responses ?? []);
  }, [recentCheckins, recentWrapups, recentStructuredCheckins]);

  const hasMorningEnergy = !!checkin?.energy_level;

  function handleEnergySaved(energyLevel: number) {
    if (!today) return;
    setCheckin((prev) =>
      prev
        ? { ...prev, energy_level: energyLevel }
        : {
            id: '',
            user_id: userId,
            date: today,
            energy_level: energyLevel,
            sleep_quality: null,
            hydration: null,
            mental_load: null,
            steps_done: false,
            water_done: false,
            water_count: 0,
            shower_done: false,
            outside_done: false,
            meal1_done: false,
            meal2_done: false,
            journaling_done: false,
            reading_done: false,
            praying_done: false,
            meditating_done: false,
            writing_done: false,
            creativity_done: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
    );
  }

  if (!today || !yesterday) return null;

  return (
    <main className="flex flex-col items-center px-6 py-8">
      <h1 className="mb-8 text-xl font-light text-text">Check-in</h1>

      <div className="flex w-full max-w-sm flex-col gap-10">
        <section>
          <p className="mb-4 text-center text-sm text-text-muted">Morning</p>
          <div className="flex flex-col gap-10">
            {/* Energy stays visible all day — read-only once answered, so
                it's still here if the user opens Check-in without having
                set it on the home screen. */}
            {hasMorningEnergy ? (
              <EnergyPicker answeredValue={checkin!.energy_level!} />
            ) : (
              <EnergyPicker onSaved={handleEnergySaved} />
            )}
            <QuestionSet
              period="morning"
              questions={morningQuestions}
              responses={morningResponses}
              onSubmitted={setMorningResponses}
            />
          </div>
        </section>

        <section>
          <p className="mb-4 text-center text-sm text-text-muted">Evening</p>
          <div className="flex flex-col gap-10">
            <QuestionSet
              period="evening"
              questions={eveningQuestions}
              responses={eveningResponses}
              onSubmitted={setEveningResponses}
            />
            <AbendSection
              today={today}
              yesterday={yesterday}
              userId={userId}
              wrapup={wrapup}
              yesterdayWrapup={yesterdayWrapup}
              onWrapupUpdated={setWrapup}
              onYesterdayWrapupUpdated={setYesterdayWrapup}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
