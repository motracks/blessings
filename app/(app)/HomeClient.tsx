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

  const showEnergyPicker = hasMorningCheckin === false;

  return (
    <main className="relative flex min-h-[calc(100dvh-64px)] flex-col items-center px-6 pt-10">
      <AmbientBackground />

      {/* One flow column: the affirmation and the energy picker always stack
          with real spacing between them — no absolute positioning that could
          let them overlap on short screens. Flexible spacers keep the plant
          near the vertical centre on tall screens; on short screens the
          column simply grows and the page scrolls rather than cramping. */}
      <div className="z-10 flex-1" aria-hidden="true" />

      <div className="z-10 aspect-square w-full max-w-[17rem] shrink-0 overflow-hidden rounded-full shadow-sm sm:max-w-xs">
        <PlantDisplay phase={phase} daysSinceLastOpen={daysSinceLastOpen} />
      </div>

      <div className="z-10 mt-8 flex w-full max-w-sm flex-col items-center gap-8">
        {affirmation && (
          <p className="max-w-[240px] text-center text-lg italic leading-relaxed text-text-muted">
            {affirmation}
          </p>
        )}
        {showEnergyPicker && (
          <EnergyPicker onSaved={() => setHasMorningCheckin(true)} />
        )}
      </div>

      {/* Bottom spacer keeps the column clear of the ambient wave that sits
          just above the nav bar (fixed, ~80px tall at bottom-16). */}
      <div className="z-10 min-h-[9rem] flex-1" aria-hidden="true" />
    </main>
  );
}
