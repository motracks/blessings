import { createClient } from '@/lib/supabase/server';
import { CheckinClient } from './CheckinClient';

export default async function CheckinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch the last few days rather than server-computed "today"/"yesterday" —
  // the server's clock/timezone can disagree with the user's local date, so
  // the client resolves which rows are actually today's and yesterday's.
  const [
    { data: recentCheckins },
    { data: recentWrapups },
    { data: questions },
    { data: recentStructuredCheckins },
  ] = await Promise.all([
    supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(3),
    supabase
      .from('evening_wrapups')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(3),
    supabase
      .from('checkin_questions')
      .select('*')
      .eq('active', true),
    supabase
      .from('checkins')
      .select('*, checkin_responses(*)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(6),
  ]);

  return (
    <CheckinClient
      userId={user.id}
      recentCheckins={recentCheckins ?? []}
      recentWrapups={recentWrapups ?? []}
      questions={questions ?? []}
      recentStructuredCheckins={recentStructuredCheckins ?? []}
    />
  );
}
