'use client';

import { useMemo, useState } from 'react';

interface AdminProfile {
  id: string;
  role: string;
  created_at: string;
}

interface AdminCheckin {
  id: string;
  user_id: string;
  date: string;
  energy_level: number | null;
  sleep_quality: number | null;
  hydration: number | null;
  mental_load: number | null;
  steps_done: boolean;
}

interface AdminCompletedTask {
  id: string;
  user_id: string;
  date: string;
  type: string;
  description: string;
  completed_at: string | null;
}

interface AdminSharedWrapup {
  id: string;
  user_id: string;
  date: string;
  journal_entry: string | null;
  tomorrow_goal: string | null;
  goal_completed: boolean;
}

interface AdminClientProps {
  profiles: AdminProfile[];
  checkins: AdminCheckin[];
  completedTasks: AdminCompletedTask[];
  sharedWrapups: AdminSharedWrapup[];
}

function shortId(id: string) {
  return id.slice(0, 8);
}

export function AdminClient({
  profiles,
  checkins,
  completedTasks,
  sharedWrapups,
}: AdminClientProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    profiles[0]?.id ?? null
  );

  const dates = useMemo(() => {
    const set = new Set<string>();
    checkins.forEach((c) => c.user_id === selectedUserId && set.add(c.date));
    completedTasks.forEach((t) => t.user_id === selectedUserId && set.add(t.date));
    sharedWrapups.forEach((w) => w.user_id === selectedUserId && set.add(w.date));
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [checkins, completedTasks, sharedWrapups, selectedUserId]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 bg-background px-6 py-8">
      <div>
        <h1 className="text-xl font-light text-text">Admin</h1>
        <p className="mt-1 text-sm text-text-muted">
          Check-in data and entries people have chosen to share.
        </p>
      </div>

      {profiles.length === 0 ? (
        <p className="text-sm text-text-muted">No users yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedUserId(p.id)}
                className={`min-h-[44px] rounded-none border px-4 py-2 text-sm transition-all duration-300 ${
                  selectedUserId === p.id
                    ? 'border-accent bg-accent text-accent-contrast'
                    : 'border-border bg-surface text-text'
                }`}
              >
                {shortId(p.id)}
                {p.role === 'admin' ? ' (admin)' : ''}
              </button>
            ))}
          </div>

          {dates.length === 0 ? (
            <p className="text-sm text-text-muted">No data for this person yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {dates.map((date) => {
                const checkin = checkins.find(
                  (c) => c.user_id === selectedUserId && c.date === date
                );
                const tasksForDate = completedTasks.filter(
                  (t) => t.user_id === selectedUserId && t.date === date
                );
                const wrapup = sharedWrapups.find(
                  (w) => w.user_id === selectedUserId && w.date === date
                );

                return (
                  <div
                    key={date}
                    className="rounded-none border border-border bg-surface p-5 shadow-sm"
                  >
                    <p className="mb-3 text-sm text-text-muted">{date}</p>

                    {checkin && (
                      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text">
                        {checkin.energy_level !== null && (
                          <span>Energy: {checkin.energy_level}</span>
                        )}
                        {checkin.sleep_quality !== null && (
                          <span>Sleep: {checkin.sleep_quality}</span>
                        )}
                        {checkin.hydration !== null && (
                          <span>Hydration: {checkin.hydration}</span>
                        )}
                        {checkin.mental_load !== null && (
                          <span>Mental load: {checkin.mental_load}</span>
                        )}
                        {checkin.steps_done && <span>Moved today</span>}
                      </div>
                    )}

                    {tasksForDate.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-text-muted">Completed tasks</p>
                        <ul className="mt-1 list-inside list-disc text-sm text-text">
                          {tasksForDate.map((t) => (
                            <li key={t.id}>{t.description}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {wrapup?.journal_entry && (
                      <div className="mb-3">
                        <p className="text-sm text-text-muted">Shared journal entry</p>
                        <p className="mt-1 text-sm text-text">{wrapup.journal_entry}</p>
                      </div>
                    )}

                    {wrapup?.tomorrow_goal && (
                      <div>
                        <p className="text-sm text-text-muted">Shared goal</p>
                        <p className="mt-1 text-sm text-text">
                          {wrapup.tomorrow_goal}
                          {wrapup.goal_completed ? ' ✓' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}
