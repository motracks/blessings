'use client';

import { useEffect, useState } from 'react';

type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night';

function getSkyPhase(hour: number): SkyPhase {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 18) return 'day';
  if (hour >= 18 && hour < 21) return 'dusk';
  return 'night';
}

const SKY_GRADIENTS: Record<SkyPhase, string> = {
  dawn: 'linear-gradient(to bottom, #F6DCC6 0%, #F8E8D6 25%, #F8F5F0 50%)',
  day: 'linear-gradient(to bottom, #E4EEF6 0%, #EEF3EC 25%, #F8F5F0 50%)',
  dusk: 'linear-gradient(to bottom, #E9CFD9 0%, #F1DCCB 25%, #F8F5F0 50%)',
  night: 'linear-gradient(to bottom, #33394A 0%, #5B5566 25%, #F8F5F0 55%)',
};

export function AmbientBackground() {
  const [phase, setPhase] = useState<SkyPhase | null>(null);

  useEffect(() => {
    setPhase(getSkyPhase(new Date().getHours()));
  }, []);

  if (!phase) return null;

  const isNight = phase === 'night';

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0 transition-colors duration-1000"
        style={{ background: SKY_GRADIENTS[phase] }}
      />

      {/* sun / moon */}
      <div
        className="absolute h-16 w-16 rounded-full transition-all duration-1000"
        style={{
          top: isNight ? '8%' : '6%',
          right: '12%',
          background: isNight
            ? 'radial-gradient(circle at 35% 35%, #F5F3EE, #DAD9D6)'
            : 'radial-gradient(circle at 35% 35%, #FFF6DE, #F3D998)',
          opacity: isNight ? 0.55 : 0.5,
          filter: 'blur(0.5px)',
        }}
      />

      {/* stars, night only */}
      {isNight && (
        <div className="absolute inset-0 opacity-40">
          {STAR_POSITIONS.map((s, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-white"
              style={{ top: s.top, left: s.left, width: s.size, height: s.size }}
            />
          ))}
        </div>
      )}

      {/* drifting clouds */}
      <div className="absolute left-0 top-[10%] w-[200%] animate-drift-slow opacity-30">
        <CloudRow />
      </div>
      <div className="absolute left-0 top-[18%] w-[200%] animate-drift-slower opacity-20">
        <CloudRow offset />
      </div>

      {/* water near the bottom, sitting above the bottom nav bar */}
      <div className="absolute bottom-16 left-0 w-[200%] opacity-50">
        <div className="animate-wave-scroll">
          <WaveRow fill="#8FB3C9" />
        </div>
      </div>
      <div className="absolute bottom-16 left-0 w-[200%] opacity-30">
        <div className="animate-wave-scroll" style={{ animationDuration: '26s', animationDirection: 'reverse' }}>
          <WaveRow fill="var(--sage)" />
        </div>
      </div>
    </div>
  );
}

const STAR_POSITIONS = [
  { top: '5%', left: '15%', size: 3 },
  { top: '12%', left: '35%', size: 2 },
  { top: '8%', left: '55%', size: 2 },
  { top: '18%', left: '75%', size: 3 },
  { top: '4%', left: '85%', size: 2 },
  { top: '22%', left: '25%', size: 2 },
  { top: '15%', left: '5%', size: 2 },
];

function CloudRow({ offset = false }: { offset?: boolean }) {
  const shift = offset ? 20 : 0;
  return (
    <svg viewBox="0 0 800 100" width="100%" height="60" preserveAspectRatio="none">
      <g fill="#FFFFFF">
        <ellipse cx={80 + shift} cy="50" rx="50" ry="18" />
        <ellipse cx={120 + shift} cy="45" rx="35" ry="15" />
        <ellipse cx={340 + shift} cy="55" rx="60" ry="20" />
        <ellipse cx={390 + shift} cy="48" rx="30" ry="14" />
        <ellipse cx={600 + shift} cy="50" rx="45" ry="16" />
        <ellipse cx={880 + shift} cy="50" rx="50" ry="18" />
        <ellipse cx={920 + shift} cy="45" rx="35" ry="15" />
        <ellipse cx={1140 + shift} cy="55" rx="60" ry="20" />
        <ellipse cx={1190 + shift} cy="48" rx="30" ry="14" />
        <ellipse cx={1400 + shift} cy="50" rx="45" ry="16" />
      </g>
    </svg>
  );
}

function WaveRow({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 1600 80" width="100%" height="80" preserveAspectRatio="none">
      <path
        d="M0,40 C100,10 200,10 300,40 C400,70 500,70 600,40 C700,10 800,10 900,40 C1000,70 1100,70 1200,40 C1300,10 1400,10 1500,40 C1550,55 1580,55 1600,40 L1600,80 L0,80 Z"
        fill={fill}
      />
    </svg>
  );
}
