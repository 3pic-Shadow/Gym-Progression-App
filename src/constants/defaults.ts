import type { AppSettings } from '@/src/models';
import { DEFAULT_RECORD_WORKOUT_DAYS } from '@/src/data/recordWorkoutPresets';

export const DEFAULT_SETTINGS: AppSettings = {
  defaultRestSeconds: 60,
  soundEnabled: true,
  chimeTone: 'classic',
  chimeVolume: 0.8,
  vibrationEnabled: true,
  vibrationDurationMs: 400,
  notificationEnabled: true,
  notificationTiming: 'five-seconds',
  notificationTitle: 'Rest ends soon',
  notificationMessage: 'Get ready for your next set.',
  keepAwakeDuringWorkout: true,
  confirmBeforeEndingWorkout: true,
  recordWorkoutDays: DEFAULT_RECORD_WORKOUT_DAYS,
  theme: 'system',
};
