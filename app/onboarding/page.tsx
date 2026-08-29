'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from('profiles')
        .update({ selected_plant: 'monstera' })
        .eq('id', user.id);
    }

    router.push('/');
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-2 text-2xl font-light text-text">Choose your plant</h1>
        <p className="mb-8 text-sm text-text-muted">
          It will grow alongside the small things you do for yourself.
        </p>

        <div className="mb-8 rounded-none border border-accent bg-surface p-6 shadow-sm">
          <Image
            src="/plants/monstera/phase-0.jpg"
            alt="Monstera"
            width={200}
            height={200}
            className="mx-auto"
          />
          <p className="mt-4 text-base text-text">Monstera</p>
        </div>

        <Button onClick={handleContinue} disabled={loading}>
          {loading ? 'Setting up…' : 'Continue'}
        </Button>
      </div>
    </main>
  );
}
