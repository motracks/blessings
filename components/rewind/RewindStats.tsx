import type { Task, WaterDropEvent, DailyCheckin, TaskType } from '@/lib/types';

interface RewindStatsProps {
  totalDrops: number;
  events: WaterDropEvent[];
  completedTasks: Task[];
  checkins: DailyCheckin[];
}

const TYPE_LABELS: Record<Exclude<TaskType, 'custom'> | 'custom', string> = {
  mobility: 'Mobility',
  cardio: 'Cardio',
  side_quest: 'Side Quests',
  micro: 'Micro-moments',
  custom: 'Your own goals',
};

export function RewindStats({ totalDrops, events, completedTasks, checkins }: RewindStatsProps) {
  const totalTasksCompleted = completedTasks.length;

  const breakdown: Record<string, number> = {};
  for (const task of completedTasks) {
    breakdown[task.type] = (breakdown[task.type] ?? 0) + 1;
  }
  const breakdownEntries = Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `${count} ${TYPE_LABELS[type as keyof typeof TYPE_LABELS] ?? type}`);

  const energyCheckins = checkins.filter((c) => c.energy_level !== null);
  const showAverageEnergy = energyCheckins.length >= 3;
  const averageEnergy = showAverageEnergy
    ? (
        energyCheckins.reduce((sum, c) => sum + (c.energy_level ?? 0), 0) / energyCheckins.length
      ).toFixed(1)
    : null;

  const daysWithCheckin = new Set(checkins.map((c) => c.date)).size;

  const stepsTicked = checkins.filter((c) => c.steps_done).length;

  const goalsCompleted = events.filter((e) => e.source === 'goal_completed').length;

  if (totalDrops === 0 && totalTasksCompleted === 0 && daysWithCheckin === 0) {
    return (
      <div className="w-full max-w-sm rounded-3xl border border-tile-idle-border bg-tile-idle p-6 text-center">
        <p className="text-sm text-text">No water drops yet.</p>
        <p className="mt-1 text-sm text-text-muted">Everything is allowed to start small.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <SectionLabel>Growth</SectionLabel>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Water drops" value={`${totalDrops}`} tint="sage" />
        <StatCard label="Tasks completed" value={`${totalTasksCompleted}`} />
      </div>

      {breakdownEntries.length > 0 && (
        <div className="mt-3 rounded-3xl border border-tile-idle-border bg-tile-idle px-5 py-4 text-center">
          <p className="text-sm text-text-muted">By type</p>
          <p className="mt-1 text-sm text-text">{breakdownEntries.join(' · ')}</p>
        </div>
      )}

      <SectionLabel>Presence</SectionLabel>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Days you've been here" value={`${daysWithCheckin}`} />
        {showAverageEnergy ? (
          <StatCard label="Average energy" value={`Ø ${averageEnergy}`} />
        ) : (
          <div className="flex items-center justify-center rounded-3xl border border-tile-idle-border bg-tile-idle px-4 py-5 text-center">
            <p className="text-xs text-text-soft">
              A few more check-ins and your average energy will show up here.
            </p>
          </div>
        )}
      </div>

      <SectionLabel>Care</SectionLabel>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Times you moved" value={`${stepsTicked}`} />
        <StatCard label="Goals completed" value={`${goalsCompleted}`} tint="gold" />
      </div>
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

const TINT_STYLES = {
  sage: 'border-sage/40 bg-sage-light',
  gold: 'border-gold/40 bg-gold-light',
} as const;

function StatCard({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint?: keyof typeof TINT_STYLES;
}) {
  return (
    <div
      className={`rounded-3xl border px-5 py-4 text-center ${
        tint ? TINT_STYLES[tint] : 'border-tile-idle-border bg-tile-idle'
      }`}
    >
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-1 text-xl text-text">{value}</p>
    </div>
  );
}
