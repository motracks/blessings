'use client';

import { useEffect, useState } from 'react';
import { calculateWiltAmount } from '@/lib/plants';

interface PlantDisplayProps {
  phase: number;
  daysSinceLastOpen: number;
  plant?: 'monstera';
}

export function PlantDisplay({
  phase,
  daysSinceLastOpen,
  plant = 'monstera',
}: PlantDisplayProps) {
  const initialWilt = calculateWiltAmount(daysSinceLastOpen);
  const [grayscale, setGrayscale] = useState(initialWilt);

  useEffect(() => {
    if (initialWilt > 0) {
      const timer = setTimeout(() => setGrayscale(0), 100);
      return () => clearTimeout(timer);
    }
  }, [initialWilt]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/plants/${plant}/phase-${phase}.jpg`}
      alt="Your plant"
      style={{
        filter: `grayscale(${grayscale})`,
        transition:
          grayscale === 0 && initialWilt > 0 ? 'filter 2.5s ease-out' : 'none',
      }}
      className="aspect-square w-full object-cover"
    />
  );
}
