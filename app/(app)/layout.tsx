import { createClient } from '@/lib/supabase/server';
import { BottomNav } from '@/components/navigation/BottomNav';

async function touchLastOpened() {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('last_opened_at')
    .eq('id', user.id)
    .single();

  const last = profile?.last_opened_at ? new Date(profile.last_opened_at).getTime() : 0;
  const thirtyMinutes = 30 * 60 * 1000;

  if (Date.now() - last > thirtyMinutes) {
    await supabase
      .from('profiles')
      .update({ last_opened_at: new Date().toISOString() })
      .eq('id', user.id);
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await touchLastOpened();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex-1">{children}</div>
      <BottomNav />
    </div>
  );
}
