import { z } from 'zod';

import { DEFAULT_RECORD_WORKOUT_DAYS } from '@/src/data/recordWorkoutPresets';
import type {
  Exercise,
  SetResult,
  WorkoutPlan,
  WorkoutSession,
  WorkoutSet,
} from '@/src/models';

const identifierSchema = z.string().min(1);
const dateTimeSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Must be a valid ISO date and time',
});
const optionalNoteSchema = z.string().trim().max(500).optional();

function hasUniqueOrders(items: { order: number }[]) {
  return new Set(items.map((item) => item.order)).size === items.length;
}

export const setTypeSchema = z.enum(['warmup', 'working']);

export const workoutPlanInputSchema = z.object({
  name: z.string().trim().min(1, 'Plan name is required').max(80),
  description: z.string().trim().max(500).optional(),
});

export const exerciseInputSchema = z.object({
  name: z.string().trim().min(1, 'Exercise name is required').max(80),
  notes: optionalNoteSchema,
  defaultRestSeconds: z.number().int().min(0).max(3600),
});

export const workoutSetInputSchema = z.object({
  type: setTypeSchema,
  targetWeightKg: z.number().min(0).max(1000),
  targetReps: z.number().int().min(1).max(1000),
  restSeconds: z.number().int().min(0).max(3600),
  notes: optionalNoteSchema,
});

export const workoutSetSchema: z.ZodType<WorkoutSet> = z.object({
  id: identifierSchema,
  order: z.number().int().nonnegative(),
  type: setTypeSchema,
  targetWeightKg: z.number().min(0).max(1000),
  targetReps: z.number().int().min(1).max(1000),
  restSeconds: z.number().int().min(0).max(3600),
  notes: optionalNoteSchema,
});

export const exerciseSchema: z.ZodType<Exercise> = z
  .object({
    id: identifierSchema,
    name: z.string().trim().min(1).max(80),
    notes: optionalNoteSchema,
    defaultRestSeconds: z.number().int().min(0).max(3600),
    sets: z.array(workoutSetSchema),
    order: z.number().int().nonnegative(),
  })
  .refine((exercise) => hasUniqueOrders(exercise.sets), {
    message: 'Set order values must be unique',
    path: ['sets'],
  });

export const workoutPlanSchema: z.ZodType<WorkoutPlan> = z
  .object({
    id: identifierSchema,
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(500).optional(),
    exercises: z.array(exerciseSchema),
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
  })
  .refine((plan) => hasUniqueOrders(plan.exercises), {
    message: 'Exercise order values must be unique',
    path: ['exercises'],
  });

export const workoutPlansSchema = z.array(workoutPlanSchema);

export const startableWorkoutPlanSchema = workoutPlanSchema
  .refine((plan) => plan.exercises.length > 0, {
    message: 'Add at least one exercise before starting',
    path: ['exercises'],
  })
  .refine((plan) => plan.exercises.every((exercise) => exercise.sets.length > 0), {
    message: 'Every exercise needs at least one set before starting',
    path: ['exercises'],
  });

export const setResultSchema: z.ZodType<SetResult> = z.object({
  id: identifierSchema,
  exerciseId: identifierSchema,
  setId: identifierSchema,
  status: z.enum(['completed', 'skipped']),
  targetWeightKg: z.number().min(0).max(1000),
  targetReps: z.number().int().min(1).max(1000),
  actualWeightKg: z.number().min(0).max(1000).optional(),
  actualReps: z.number().int().min(0).max(1000).optional(),
  isPersonalRecord: z.boolean().optional(),
  completedAt: dateTimeSchema,
});

export const workoutSessionSchema: z.ZodType<WorkoutSession> = z.object({
  id: identifierSchema,
  planId: identifierSchema,
  planSnapshot: workoutPlanSchema,
  mode: z.enum(['planned', 'recording']).optional(),
  status: z.enum(['active', 'resting', 'paused', 'completed', 'cancelled']),
  currentExerciseIndex: z.number().int().nonnegative(),
  currentSetIndex: z.number().int().nonnegative(),
  results: z.array(setResultSchema),
  startedAt: dateTimeSchema,
  completedAt: dateTimeSchema.optional(),
  pausedAt: dateTimeSchema.optional(),
  pausedFromStatus: z.enum(['active', 'resting']).optional(),
  pausedRestMilliseconds: z.number().int().nonnegative().optional(),
  totalPausedMilliseconds: z.number().int().nonnegative(),
  restEndsAt: z.number().int().nonnegative().optional(),
  restStartedAt: z.number().int().nonnegative().optional(),
});

export const activeWorkoutSessionSchema = workoutSessionSchema
  .refine((session) => ['active', 'resting', 'paused'].includes(session.status), {
    message: 'Active-session storage cannot contain a finished workout',
    path: ['status'],
  })
  .refine(
    (session) =>
      session.status !== 'resting' ||
      (session.mode === 'recording'
        ? session.restStartedAt !== undefined
        : session.restEndsAt !== undefined),
    {
      message: 'A resting workout requires a timer timestamp',
      path: ['restEndsAt'],
    }
  );

export const completedWorkoutSessionSchema = workoutSessionSchema.refine(
  (session) => session.status === 'completed' && Boolean(session.completedAt),
  { message: 'History can only contain completed workouts', path: ['status'] }
);

export const workoutHistorySchema = z.array(completedWorkoutSessionSchema);

export const recorderDaySchema = z
  .object({
    id: identifierSchema,
    name: z.string().trim().min(1).max(80),
    exercises: z.array(z.string().trim().min(1).max(80)).max(100),
  })
  .refine(
    (day) =>
      new Set(day.exercises.map((exercise) => exercise.trim().toLowerCase())).size ===
      day.exercises.length,
    { message: 'Exercise names must be unique within a recorder day', path: ['exercises'] }
  );

export const recorderDaysSchema = z
  .array(recorderDaySchema)
  .min(1)
  .max(50)
  .refine((days) => new Set(days.map((day) => day.id)).size === days.length, {
    message: 'Recorder day identifiers must be unique',
  })
  .refine(
    (days) => new Set(days.map((day) => day.name.trim().toLowerCase())).size === days.length,
    { message: 'Recorder day names must be unique' }
  );

export const appSettingsSchema = z.object({
  defaultRestSeconds: z.number().int().min(0).max(3600),
  soundEnabled: z.boolean(),
  chimeTone: z.enum(['classic', 'bright', 'deep']).default('classic'),
  chimeVolume: z.number().min(0).max(1).default(0.8),
  vibrationEnabled: z.boolean(),
  vibrationDurationMs: z.number().int().min(100).max(1500).default(400),
  notificationEnabled: z.boolean().default(true),
  notificationTiming: z
    .enum(['five-seconds', 'ten-seconds', 'rest-complete'])
    .default('five-seconds'),
  notificationTitle: z.string().trim().min(1).max(80).default('Rest ends soon'),
  notificationMessage: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .default('Get ready for your next set.'),
  keepAwakeDuringWorkout: z.boolean(),
  confirmBeforeEndingWorkout: z.boolean(),
  recordWorkoutDays: recorderDaysSchema.default(DEFAULT_RECORD_WORKOUT_DAYS),
  theme: z.enum([
    'system',
    'light',
    'dark',
    'micro-interactions',
    'inclusive',
    'soft-ui',
    'cyberpunk',
    'neubrutalism',
  ]),
});

export const backupSchema = z.object({
  format: z.literal('gym-timer-backup'),
  version: z.literal(1),
  exportedAt: dateTimeSchema,
  plans: workoutPlansSchema,
  history: workoutHistorySchema,
  settings: appSettingsSchema,
});
