'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import type { PlantType } from '@/lib/types';

interface SettingsClientProps {
  email: string;
  selectedPlant: PlantType;
}

export function SettingsClient({ email, selectedPlant }: SettingsClientProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <main className="flex flex-col items-center px-6 py-8">
      <h1 className="mb-8 text-xl font-light text-text">Settings</h1>

      <div className="flex w-full max-w-sm flex-col gap-8">
        <section>
          <p className="mb-3 text-sm text-text-muted">Your plant</p>
          <div className="rounded-none border border-accent bg-surface p-6 shadow-sm">
            <Image
              src="/plants/monstera/phase-0.jpg"
              alt="Monstera"
              width={160}
              height={160}
              className="mx-auto"
            />
            <p className="mt-4 text-center text-base text-text">Monstera</p>
            <p className="mt-1 text-center text-sm text-text-muted">
              {selectedPlant === 'monstera' ? 'Currently growing' : ''}
            </p>
          </div>
          <p className="mt-3 text-center text-sm text-text-muted">
            More plants will be added over time.
          </p>
        </section>

        <section>
          <p className="mb-3 text-sm text-text-muted">Account</p>
          <div className="rounded-none border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm text-text-muted">Email</p>
            <p className="mt-1 text-base text-text">{email}</p>
          </div>
        </section>

        <Button variant="secondary" onClick={handleSignOut} disabled={signingOut}>
          {signingOut ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>
    </main>
  );
}
