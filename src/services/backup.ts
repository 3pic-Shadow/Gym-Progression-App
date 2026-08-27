import type { AppSettings, WorkoutPlan, WorkoutSession } from '@/src/models';
import { backupSchema } from '@/src/validation';

export interface AppBackup {
  format: 'gym-timer-backup';
  version: 1;
  exportedAt: string;
  plans: WorkoutPlan[];
  history: WorkoutSession[];
  settings: AppSettings;
}

export function createBackup(plans: WorkoutPlan[], history: WorkoutSession[], settings: AppSettings) {
  return backupSchema.parse({
    format: 'gym-timer-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    plans,
    history,
    settings,
  });
}

export function serializeBackup(backup: AppBackup) {
  return JSON.stringify(backup, null, 2);
}

export function parseBackup(raw: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('This is not valid JSON');
  }

  const result = backupSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error('This backup is invalid or from an unsupported version');
  }
  return result.data;
}
