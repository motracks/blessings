'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TaskCard } from '@/components/tasks/TaskCard';
import { CustomTaskForm } from '@/components/tasks/CustomTaskForm';
import { HabitTiles } from '@/components/tasks/HabitTiles';
import { getLocalDateString } from '@/lib/dates';
import type { Task, DailyCheckin } from '@/lib/types';

interface TasksClientProps {
  userId: string;
  recentCheckins: DailyCheckin[];
  recentTasks: Task[];
}

export function TasksClient({ userId, recentCheckins, recentTasks }: TasksClientProps) {
  const [today, setToday] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checkin, setCheckin] = useState<DailyCheckin | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);

  useEffect(() => {
    const localToday = getLocalDateString();
    setToday(localToday);
    setTasks(recentTasks.filter((t) => t.date === localToday));
    setCheckin(recentCheckins.find((c) => c.date === localToday) ?? null);
  }, [recentTasks, recentCheckins]);

  const energyLevel = checkin?.energy_level ?? null;
  const isLowEnergy = energyLevel !== null && energyLevel <= 2;
  const visibleTasks = tasks.filter((t) => !t.is_dismissed);

  async function handleComplete(taskId: string): Promise<boolean> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.rpc('complete_task', {
      p_task_id: taskId,
      p_user_id: user.id,
      p_today: getLocalDateString(),
    });

    if (error) {
      console.error('complete_task failed:', error.message);
      return false;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_completed: true } : t))
    );
    return true;
  }

  async function handleAddCustomTask(description: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !today) return;

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        date: today,
        type: 'custom',
        description,
        points_value: 2,
        source: 'custom',
      })
      .select()
      .single();

    if (!error && data) {
      setTasks((prev) => [...prev, data]);
      setShowCustomForm(false);
    }
  }

  return (
    <main className="flex flex-col items-center px-6 py-8">
      <h1 className="mb-6 text-2xl italic text-text" style={{ fontFamily: 'var(--font-serif)' }}>
        Today
      </h1>

      {today && (
        <HabitTiles
          userId={userId}
          today={today}
          checkin={checkin}
          onCheckinUpdated={setCheckin}
        />
      )}

      {isLowEnergy && (
        <p className="mt-6 max-w-sm text-center text-sm text-text-muted">
          Today it&apos;s okay for things to be small.
          <br />
          You don&apos;t need to prove anything today.
        </p>
      )}

      <p className="mb-3 mt-6 w-full max-w-sm border-b border-border pb-2 text-[10.5px] font-semibold uppercase tracking-widest text-text-soft">
        Your own Goals
      </p>

      {visibleTasks.length === 0 ? (
        <p className="mb-6 max-w-sm text-center text-sm text-text-muted">
          A space for whatever you&apos;d like to add today.
        </p>
      ) : (
        <div className="w-full max-w-sm flex flex-col gap-[10px]">
          {visibleTasks.map((task) => (
            <TaskCard key={task.id} task={task} onComplete={handleComplete} />
          ))}
        </div>
      )}

      {showCustomForm ? (
        <div className="mt-4 w-full max-w-sm">
          <CustomTaskForm
            onAdd={handleAddCustomTask}
            onCancel={() => setShowCustomForm(false)}
          />
        </div>
      ) : (
        <button
          onClick={() => setShowCustomForm(true)}
          className="mt-4 text-sm text-text-muted underline underline-offset-2 transition-all duration-300"
        >
          + Add your own goal
        </button>
      )}
    </main>
  );
}
