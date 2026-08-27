export type SetType = 'warmup' | 'working';

export interface WorkoutSet {
  id: string;
  order: number;
  type: SetType;
  targetWeightKg: number;
  targetReps: number;
  restSeconds: number;
  notes?: string;
}

export interface Exercise {
  id: string;
  name: string;
  notes?: string;
  defaultRestSeconds: number;
  sets: WorkoutSet[];
  order: number;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  exercises: Exercise[];
  createdAt: string;
  updatedAt: string;
}

export type SessionStatus = 'active' | 'resting' | 'paused' | 'completed' | 'cancelled';

export type SessionMode = 'planned' | 'recording';

export type PausedSessionStatus = 'active' | 'resting';

export type SetResultStatus = 'completed' | 'skipped';

export interface SetResult {
  id: string;
  exerciseId: string;
  setId: string;
  status: SetResultStatus;
  targetWeightKg: number;
  targetReps: number;
  actualWeightKg?: number;
  actualReps?: number;
  isPersonalRecord?: boolean;
  completedAt: string;
}

export interface WorkoutSession {
  id: string;
  planId: string;
  planSnapshot: WorkoutPlan;
  /** Missing on older saved sessions, which are treated as planned workouts. */
  mode?: SessionMode;
  status: SessionStatus;
  currentExerciseIndex: number;
  currentSetIndex: number;
  results: SetResult[];
  startedAt: string;
  completedAt?: string;
  pausedAt?: string;
  pausedFromStatus?: PausedSessionStatus;
  pausedRestMilliseconds?: number;
  totalPausedMilliseconds: number;
  restEndsAt?: number;
  /** Count-up rest start used by manually recorded workouts. */
  restStartedAt?: number;
}

export type ThemePreference =
  | 'system'
  | 'light'
  | 'dark'
  | 'micro-interactions'
  | 'inclusive'
  | 'soft-ui'
  | 'cyberpunk'
  | 'neubrutalism';

export type ChimeTone = 'classic' | 'bright' | 'deep';

export type NotificationTiming = 'five-seconds' | 'ten-seconds' | 'rest-complete';

export interface RecorderDay {
  id: string;
  name: string;
  exercises: string[];
}

export interface AppSettings {
  defaultRestSeconds: number;
  soundEnabled: boolean;
  chimeTone: ChimeTone;
  chimeVolume: number;
  vibrationEnabled: boolean;
  vibrationDurationMs: number;
  notificationEnabled: boolean;
  notificationTiming: NotificationTiming;
  notificationTitle: string;
  notificationMessage: string;
  keepAwakeDuringWorkout: boolean;
  confirmBeforeEndingWorkout: boolean;
  recordWorkoutDays: RecorderDay[];
  theme: ThemePreference;
}
