'use client';

import { useState } from 'react';
import {
  Footprints,
  Droplet,
  ShowerHead,
  Trees,
  UtensilsCrossed,
  NotebookPen,
  BookOpen,
  HandHeart,
  Flower2,
  PenLine,
  Palette,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { DailyCheckin } from '@/lib/types';

const CIRCLE_SIZE = 132;

type BodyHabitKey = 'steps' | 'shower' | 'outside';
type SoulHabitKey = 'meal1' | 'meal2' | 'writing' | 'creativity';
type MindHabitKey = 'journaling' | 'reading' | 'praying' | 'meditating';

const BODY_HABITS: {
  key: BodyHabitKey;
  label: string;
  icon: typeof Footprints;
  field: keyof Pick<DailyCheckin, 'steps_done' | 'shower_done' | 'outside_done'>;
  rpc: 'award_steps' | 'award_shower' | 'award_outside';
}[] = [
  { key: 'steps', label: 'Daily Steps', icon: Footprints, field: 'steps_done', rpc: 'award_steps' },
  { key: 'shower', label: 'Shower', icon: ShowerHead, field: 'shower_done', rpc: 'award_shower' },
  { key: 'outside', label: 'Been Outside', icon: Trees, field: 'outside_done', rpc: 'award_outside' },
];

const SOUL_HABITS: {
  key: SoulHabitKey;
  label: string;
  icon: typeof UtensilsCrossed;
  field: keyof Pick<
    DailyCheckin,
    'meal1_done' | 'meal2_done' | 'writing_done' | 'creativity_done'
  >;
  rpc: 'award_meal1' | 'award_meal2' | 'award_writing' | 'award_creativity';
}[] = [
  { key: 'meal1', label: '1st Proper Meal', icon: UtensilsCrossed, field: 'meal1_done', rpc: 'award_meal1' },
  { key: 'meal2', label: '2nd Proper Meal', icon: UtensilsCrossed, field: 'meal2_done', rpc: 'award_meal2' },
  { key: 'writing', label: 'Writing', icon: PenLine, field: 'writing_done', rpc: 'award_writing' },
  { key: 'creativity', label: 'Creativity', icon: Palette, field: 'creativity_done', rpc: 'award_creativity' },
];

const MIND_HABITS: {
  key: MindHabitKey;
  label: string;
  icon: typeof NotebookPen;
  field: keyof Pick<
    DailyCheckin,
    'journaling_done' | 'reading_done' | 'praying_done' | 'meditating_done'
  >;
  rpc: 'award_journaling' | 'award_reading' | 'award_praying' | 'award_meditating';
}[] = [
  { key: 'journaling', label: 'Journaling', icon: NotebookPen, field: 'journaling_done', rpc: 'award_journaling' },
  { key: 'reading', label: 'Reading', icon: BookOpen, field: 'reading_done', rpc: 'award_reading' },
  { key: 'praying', label: 'Praying', icon: HandHeart, field: 'praying_done', rpc: 'award_praying' },
  { key: 'meditating', label: 'Meditating', icon: Flower2, field: 'meditating_done', rpc: 'award_meditating' },
];

type SavingKey = BodyHabitKey | SoulHabitKey | MindHabitKey | 'water';

interface HabitTilesProps {
  userId: string;
  today: string;
  checkin: DailyCheckin | null;
  onCheckinUpdated: (checkin: DailyCheckin) => void;
}

export function HabitTiles({ userId, today, checkin, onCheckinUpdated }: HabitTilesProps) {
  const [savingKey, setSavingKey] = useState<SavingKey | null>(null);
  const [errorKey, setErrorKey] = useState<SavingKey | null>(null);

  async function callAward(key: SavingKey, rpc: string, apply: () => DailyCheckin) {
    if (!checkin || savingKey) return;
    setSavingKey(key);
    setErrorKey(null);

    const supabase = createClient();
    const { error } = await supabase.rpc(rpc, {
      p_user_id: userId,
      p_date: today,
    });

    if (error) {
      setErrorKey(key);
    } else {
      onCheckinUpdated(apply());
    }
    setSavingKey(null);
  }

  function handleToggle<T extends { key: SavingKey; field: keyof DailyCheckin; rpc: string }>(
    habit: T
  ) {
    if (!checkin || checkin[habit.field]) return;
    callAward(habit.key, habit.rpc, () => ({ ...checkin, [habit.field]: true }));
  }

  function handleWaterTap() {
    if (!checkin || checkin.water_count >= 3) return;
    callAward('water', 'award_water', () => ({
      ...checkin,
      water_count: checkin.water_count + 1,
      water_done: checkin.water_count + 1 >= 3,
    }));
  }

  const waterCount = checkin?.water_count ?? 0;
  const waterDone = waterCount >= 3;

  return (
    <div className="w-full max-w-sm">
      <SectionLabel>Body</SectionLabel>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6">
        <div className="flex justify-center">
          <button
            onClick={handleWaterTap}
            disabled={!checkin || savingKey === 'water' || waterDone}
            style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
            className={`relative flex shrink-0 flex-col items-center justify-center gap-1 rounded-full border p-4 text-center transition-all duration-300 disabled:cursor-default ${
              waterDone ? 'border-tile-done-border bg-tile-done' : 'border-tile-idle-border bg-tile-idle'
            }`}
          >
            {waterDone && <OutsideCheck />}
            <Droplet
              size={32}
              strokeWidth={1.1}
              className={waterDone ? 'text-accent' : 'text-text-soft'}
            />
            <span className={`text-xs ${waterDone ? 'text-text' : 'text-text-muted'}`}>Water</span>
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`h-1 w-1 rounded-full border ${
                    i < waterCount ? 'border-accent bg-accent' : 'border-text-soft bg-transparent'
                  }`}
                />
              ))}
            </span>
          </button>
        </div>

        {BODY_HABITS.map((habit) => {
          const isDone = !!checkin?.[habit.field];
          const Icon = habit.icon;
          return (
            <HabitCircle
              key={habit.key}
              label={habit.label}
              Icon={Icon}
              isDone={isDone}
              disabled={!checkin || savingKey === habit.key || isDone}
              onClick={() => handleToggle(habit)}
            />
          );
        })}
      </div>

      <SectionLabel>Mind</SectionLabel>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6">
        {MIND_HABITS.map((habit) => {
          const isDone = !!checkin?.[habit.field];
          const Icon = habit.icon;
          return (
            <HabitCircle
              key={habit.key}
              label={habit.label}
              Icon={Icon}
              isDone={isDone}
              disabled={!checkin || savingKey === habit.key || isDone}
              onClick={() => handleToggle(habit)}
            />
          );
        })}
      </div>

      <SectionLabel>Soul</SectionLabel>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6">
        {SOUL_HABITS.map((habit) => {
          const isDone = !!checkin?.[habit.field];
          const Icon = habit.icon;
          return (
            <HabitCircle
              key={habit.key}
              label={habit.label}
              Icon={Icon}
              isDone={isDone}
              disabled={!checkin || savingKey === habit.key || isDone}
              onClick={() => handleToggle(habit)}
            />
          );
        })}
      </div>

      {!checkin && (
        <p className="mt-6 text-center text-sm text-text-muted">
          Set today&apos;s energy on home first, then these will be ready.
        </p>
      )}
      {errorKey && (
        <p className="mt-3 text-center text-sm text-text-muted">
          That did not work. Please try again.
        </p>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 mt-6 border-b border-border pb-2 text-[10.5px] font-semibold uppercase tracking-widest text-text-soft first:mt-0">
      {children}
    </p>
  );
}

function OutsideCheck() {
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-background">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.6"
      >
        <polyline points="4,12 10,18 20,6" />
      </svg>
    </span>
  );
}

function HabitCircle({
  label,
  Icon,
  isDone,
  disabled,
  onClick,
}: {
  label: string;
  Icon: typeof Footprints;
  isDone: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex justify-center">
      <button
        onClick={onClick}
        disabled={disabled}
        style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
        className={`relative flex shrink-0 flex-col items-center justify-center gap-2 rounded-full border p-4 text-center transition-all duration-300 disabled:cursor-default ${
          isDone ? 'border-tile-done-border bg-tile-done' : 'border-tile-idle-border bg-tile-idle'
        }`}
      >
        {isDone && <OutsideCheck />}
        <Icon size={32} strokeWidth={1.1} className={isDone ? 'text-accent' : 'text-text-soft'} />
        <span className={`text-xs leading-tight ${isDone ? 'text-text' : 'text-text-muted'}`}>
          {label}
        </span>
      </button>
    </div>
  );
}
