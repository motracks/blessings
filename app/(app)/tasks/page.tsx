import { createClient } from '@/lib/supabase/server';
import { TasksClient } from './TasksClient';

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch the last couple of days rather than a server-computed "today" —
  // the server's clock/timezone can disagree with the user's local date,
  // so the client resolves which rows actually belong to today.
  const [{ data: recentCheckins }, { data: recentTasks }] = await Promise.all([
    supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(2),
    supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(20),
  ]);

  return (
    <TasksClient
      userId={user.id}
      recentCheckins={recentCheckins ?? []}
      recentTasks={recentTasks ?? []}
    />
  );
}
