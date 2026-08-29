import { createClient } from '@/lib/supabase/server';
import { getDaysSinceLastOpen } from '@/lib/plants';
import { PlantDisplay } from '@/components/plant/PlantDisplay';
import { RewindStats } from '@/components/rewind/RewindStats';
import type { Task, WaterDropEvent, DailyCheckin } from '@/lib/types';

export default async function RewindPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  await supabase.rpc('settle_plant_phase', { p_user_id: user.id });

  const [{ data: profile }, { data: plantProgress }, { data: events }, { data: tasks }, { data: checkins }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('plant_progress').select('*').eq('user_id', user.id).single(),
      supabase
        .from('water_drop_events')
        .select('*')
        .eq('user_id', user.id),
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', true),
      supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id),
    ]);

  const daysSinceLastOpen = getDaysSinceLastOpen(profile?.last_opened_at ?? null);

  return (
    <main className="flex flex-col items-center px-6 py-8">
      <h1 className="mb-6 text-2xl italic text-text" style={{ fontFamily: 'var(--font-serif)' }}>
        Rewind
      </h1>

      <div className="aspect-square w-full max-w-xs overflow-hidden rounded-full shadow-sm">
        <PlantDisplay
          phase={plantProgress?.displayed_phase ?? 0}
          daysSinceLastOpen={daysSinceLastOpen}
        />
      </div>

      <div className="relative mt-8 w-full max-w-sm">
        <div className="pointer-events-none select-none blur-md" aria-hidden="true">
          <RewindStats
            totalDrops={plantProgress?.total_water_drops ?? 0}
            events={(events ?? []) as WaterDropEvent[]}
            completedTasks={(tasks ?? []) as Task[]}
            checkins={(checkins ?? []) as DailyCheckin[]}
          />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <span className="text-2xl" aria-hidden="true">🔒</span>
          <p className="text-sm text-text/70" style={{ fontFamily: 'var(--font-serif)' }}>
            Rewind unlocks soon
          </p>
        </div>
      </div>
    </main>
  );
}
