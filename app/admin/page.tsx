import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminClient } from './AdminClient';
import { isAdmin } from '@/lib/permissions';
import type { Profile } from '@/lib/types';

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Server-side role check — never trust a client-side check for admin access.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!isAdmin(profile as Pick<Profile, 'role'> | null)) {
    redirect('/');
  }

  const [{ data: profiles }, { data: checkins }, { data: tasks }, { data: wrapups }] =
    await Promise.all([
      supabase.rpc('admin_list_profiles'),
      supabase.rpc('admin_list_checkins'),
      supabase.rpc('admin_list_completed_tasks'),
      supabase.rpc('admin_list_shared_wrapups'),
    ]);

  return (
    <AdminClient
      profiles={profiles ?? []}
      checkins={checkins ?? []}
      completedTasks={tasks ?? []}
      sharedWrapups={wrapups ?? []}
    />
  );
}
