'use client';

import { useEffect, useState } from 'react';
import { PlantDisplay } from '@/components/plant/PlantDisplay';
import { EnergyPicker } from '@/components/checkin/EnergyPicker';
import { AmbientBackground } from '@/components/ambient/AmbientBackground';
import { getLocalDateString, hashStringToIndex } from '@/lib/dates';
import type { Affirmation, DailyCheckin } from '@/lib/types';

interface HomeClientProps {
  phase: number;
  daysSinceLastOpen: number;
  recentCheckins: DailyCheckin[];
  affirmations: Affirmation[];
}

export function HomeClient({
  phase,
  daysSinceLastOpen,
  recentCheckins,
  affirmations,
}: HomeClientProps) {
  const [hasMorningCheckin, setHasMorningCheckin] = useState<boolean | null>(null);
  const [affirmation, setAffirmation] = useState<string | null>(null);

  useEffect(() => {
    const today = getLocalDateString();
    const todaysCheckin = recentCheckins.find((c) => c.date === today);
    setHasMorningCheckin(!!todaysCheckin?.energy_level);

    if (affirmations.length > 0) {
      const index = hashStringToIndex(today, affirmations.length);
      setAffirmation(affirmations[index].text);
    }
  }, [recentCheckins, affirmations]);

  return (
    <main className="relative min-h-[calc(100dvh-64px)] px-6 py-8">
      <AmbientBackground />

      {/* Plant circle: its own center pinned to the exact vertical/horizontal
          center of the screen, independent of the affirmation text below it. */}
      <div
        className="absolute z-10 aspect-square w-full max-w-xs overflow-hidden rounded-full shadow-sm"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <PlantDisplay phase={phase} daysSinceLastOpen={daysSinceLastOpen} />
      </div>

      {/* Affirmation sits below the circle's vertical center, offset by half
          the circle's own radius plus spacing — it never affects the circle's position. */}
      {affirmation && (
        <p
          className="absolute z-10 max-w-[220px] text-center text-lg italic leading-relaxed text-text-muted"
          style={{
            top: 'calc(50% + 12rem)',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          {affirmation}
        </p>
      )}

      <div
        className="absolute z-10 w-full max-w-sm px-6"
        style={{ bottom: '2rem', left: '50%', transform: 'translateX(-50%)' }}
      >
        {hasMorningCheckin === false && (
          <EnergyPicker onSaved={() => setHasMorningCheckin(true)} />
        )}
      </div>
    </main>
  );
}
