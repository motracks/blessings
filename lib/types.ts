export type Role = 'admin' | 'coachee';
export type PlantType = 'monstera';
export type TaskType = 'mobility' | 'cardio' | 'side_quest' | 'micro' | 'custom';
export type TaskSource = 'generated' | 'custom';
export type Visibility = 'private' | 'shared';
export type WaterDropSource =
  | 'task'
  | 'steps'
  | 'goal_completed'
  | 'water'
  | 'shower'
  | 'outside'
  | 'meal1'
  | 'meal2'
  | 'journaling'
  | 'reading'
  | 'praying'
  | 'meditating'
  | 'writing'
  | 'creativity';

export interface Profile {
  id: string;
  role: Role;
  selected_plant: PlantType;
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlantProgress {
  user_id: string;
  total_water_drops: number;
  displayed_phase: number;
  phase_advanced_at: string;
  created_at: string;
  updated_at: string;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  date: string;
  energy_level: number | null;
  sleep_quality: number | null;
  hydration: number | null;
  mental_load: number | null;
  steps_done: boolean;
  water_done: boolean;
  shower_done: boolean;
  outside_done: boolean;
  meal1_done: boolean;
  meal2_done: boolean;
  journaling_done: boolean;
  reading_done: boolean;
  praying_done: boolean;
  meditating_done: boolean;
  writing_done: boolean;
  creativity_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskLibraryItem {
  id: string;
  description: string;
  type: Exclude<TaskType, 'custom'>;
  base_points: number;
  is_low_energy: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  library_id: string | null;
  date: string;
  type: TaskType;
  description: string;
  is_completed: boolean;
  is_dismissed: boolean;
  completed_at: string | null;
  points_value: number;
  source: TaskSource;
  created_at: string;
}

export interface EveningWrapup {
  id: string;
  user_id: string;
  date: string;
  journal_entry: string | null;
  journal_visibility: Visibility;
  tomorrow_goal: string | null;
  goal_visibility: Visibility;
  goal_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type CheckinPeriod = 'morning' | 'evening';
export type CheckinDomain =
  | 'sleep'
  | 'self_kindness'
  | 'mental_load'
  | 'engagement'
  | 'connection'
  | 'identity';

export interface CheckinQuestion {
  question_key: string;
  domain: CheckinDomain;
  period: CheckinPeriod;
  text_en: string;
  text_de: string;
  active: boolean;
}

export interface Checkin {
  id: string;
  user_id: string;
  period: CheckinPeriod;
  date: string;
  created_at: string;
  completed_at: string | null;
}

export interface CheckinResponse {
  id: string;
  user_id: string;
  checkin_id: string;
  question_key: string;
  domain: CheckinDomain;
  period: CheckinPeriod;
  value: number;
  created_at: string;
}

export interface Affirmation {
  id: string;
  text: string;
  is_active: boolean;
  created_at: string;
}

export interface WaterDropEvent {
  id: string;
  user_id: string;
  task_id: string | null;
  source: WaterDropSource;
  base_points: number;
  multiplier: number;
  awarded_points: number;
  created_at: string;
}
