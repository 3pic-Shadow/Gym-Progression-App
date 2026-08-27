export const STORAGE_SCHEMA_VERSION = 1 as const;

export const STORAGE_KEYS = {
  plans: 'gymTimer.plans.v1',
  activeSession: 'gymTimer.activeSession.v1',
  history: 'gymTimer.history.v1',
  settings: 'gymTimer.settings.v1',
} as const;
