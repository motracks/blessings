// Reference only. Authoritative point calculation happens inside Postgres RPC
// functions (complete_task, award_steps, award_goal_completed) via SECURITY DEFINER.
// Nothing in this file is trusted for actual point awarding.

export const LOW_ENERGY_MULTIPLIER = 2.0;
export const LOW_ENERGY_THRESHOLD = 2; // energy_level <= 2
export const STEPS_AWARD_POINTS = 2;
export const GOAL_COMPLETED_AWARD_POINTS = 2;
