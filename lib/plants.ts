export const PHASE_THRESHOLDS = [0, 10, 25, 50, 90, 140, 200, 280];

// Reference only — the phase actually shown to the user is
// plant_progress.displayed_phase, throttled server-side (settle_plant_phase
// RPC) to advance by at most one step every 2 days, regardless of how many
// drops have accumulated. getPlantPhase() is the "fully earned" phase these
// thresholds would produce with no pacing limit; it's kept here for
// reference/testing but nothing in the app calls it directly anymore.
export function getPlantPhase(totalDrops: number): number {
  let phase = 0;
  for (let i = 0; i < PHASE_THRESHOLDS.length; i++) {
    if (totalDrops >= PHASE_THRESHOLDS[i]) phase = i;
  }
  return phase; // 0–7
}

export function getDaysSinceLastOpen(lastOpenedAt: string | null): number {
  if (!lastOpenedAt) return 0;
  const diff = Date.now() - new Date(lastOpenedAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function calculateWiltAmount(daysSinceLastOpen: number): number {
  // Wilting begins after 3 days, caps at 80% grayscale over the following 7 days
  return Math.min(Math.max(0, (daysSinceLastOpen - 3) / 7), 0.8);
}
