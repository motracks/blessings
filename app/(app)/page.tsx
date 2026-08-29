import { createClient } from '@/lib/supabase/server';
import { getDaysSinceLastOpen } from '@/lib/plants';
import { HomeClient } from './HomeClient';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Advance the visible plant phase by at most one step for each full
  // 2-day window elapsed, regardless of how many drops have accumulated —
  // must settle before reading plant_progress so displayed_phase is current.
  await supabase.rpc('settle_plant_phase', { p_user_id: user.id });

  const [{ data: profile }, { data: plantProgress }, { data: recentCheckins }, { data: affirmations }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('plant_progress').select('*').eq('user_id', user.id).single(),
      // Fetch the last couple of days rather than a server-computed "today" —
      // the server's clock/timezone can disagree with the user's local date,
      // so the client resolves which row (if any) is actually today's.
      supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(2),
      supabase
        .from('affirmations')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
    ]);

  const daysSinceLastOpen = getDaysSinceLastOpen(profile?.last_opened_at ?? null);

  return (
    <HomeClient
      phase={plantProgress?.displayed_phase ?? 0}
      daysSinceLastOpen={daysSinceLastOpen}
      recentCheckins={recentCheckins ?? []}
      affirmations={affirmations ?? []}
    />
  );
}
