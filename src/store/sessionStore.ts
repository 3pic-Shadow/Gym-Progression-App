import { create } from 'zustand';

import { STORAGE_KEYS } from '@/src/constants/storage';
import type { WorkoutPlan, WorkoutSession } from '@/src/models';
import { loadValidated, removeStoredValue, saveValidated } from '@/src/services/persistence';
import {
  adjustRestPeriod,
  finishRestPeriod,
  getCurrentSet,
  insertTemporarySets,
  pauseWorkoutSession,
  recordCurrentSet,
  resumeWorkoutSession,
  startRestPeriod,
  type SetCompletionInput,
  undoLastRecordedSet,
} from '@/src/services/workoutProgression';
import { createId } from '@/src/utils/id';
import {
  activeWorkoutSessionSchema,
  startableWorkoutPlanSchema,
  workoutHistorySchema,
} from '@/src/validation';

interface SessionState {
  activeSession: WorkoutSession | null;
  history: WorkoutSession[];
  isHydrated: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  startWorkout: (plan: WorkoutPlan) => Promise<string>;
  startRecordedWorkout: (dayName: string) => Promise<string>;
  recordManualSet: (exerciseName: string, actualWeightKg: number, actualReps: number) => Promise<void>;
  finishRecordedWorkout: () => Promise<string>;
  completeCurrentSet: (
    actualWeightKg: number,
    actualReps: number,
    isPersonalRecord?: boolean
  ) => Promise<boolean>;
  skipCurrentSet: () => Promise<boolean>;
  pauseWorkout: () => Promise<void>;
  resumeWorkout: () => Promise<void>;
  adjustRest: (adjustmentSeconds: number) => Promise<void>;
  finishRest: () => Promise<void>;
  addTemporarySets: (input: {
    sourceExerciseId?: string;
    exerciseName?: string;
    count: 1 | 2;
    defaultRestSeconds: number;
    targetWeightKg: number;
    targetReps: number;
    restSeconds: number;
  }) => Promise<void>;
  undoLastSet: () => Promise<void>;
  cancelWorkout: () => Promise<void>;
  saveActiveSession: (session: WorkoutSession | null) => Promise<void>;
  replaceHistory: (history: WorkoutSession[]) => Promise<void>;
  removeHistoryEntry: (sessionId: string) => Promise<void>;
  recordSet: (input: SetCompletionInput) => Promise<boolean>;
}

async function persistActiveSession(session: WorkoutSession) {
  await saveValidated(STORAGE_KEYS.activeSession, session, activeWorkoutSessionSchema);
}

async function persistHistory(history: WorkoutSession[]) {
  await saveValidated(STORAGE_KEYS.history, history, workoutHistorySchema);
}

function isAutomaticPersonalRecord(
  session: WorkoutSession,
  history: WorkoutSession[],
  exerciseName: string,
  actualWeightKg: number,
  actualReps: number
) {
  const normalizedExerciseName = exerciseName.trim().toLowerCase();
  if (!normalizedExerciseName || actualWeightKg < 0 || actualReps < 0) {
    return false;
  }

  let bestWeightKg = -1;
  let bestReps = -1;
  const consider = (weight: number | undefined, reps: number | undefined) => {
    if (weight === undefined || reps === undefined) return;
    if (weight > bestWeightKg || (weight === bestWeightKg && reps > bestReps)) {
      bestWeightKg = weight;
      bestReps = reps;
    }
  };

  for (const workout of history) {
    for (const result of workout.results) {
      if (result.status !== 'completed') continue;
      const exercise = workout.planSnapshot.exercises.find((item) => item.id === result.exerciseId);
      if (exercise?.name.trim().toLowerCase() === normalizedExerciseName) {
        consider(result.actualWeightKg, result.actualReps);
      }
    }
  }

  for (const result of session.results) {
    if (result.status !== 'completed') continue;
    const exercise = session.planSnapshot.exercises.find((item) => item.id === result.exerciseId);
    if (exercise?.name.trim().toLowerCase() === normalizedExerciseName) {
      consider(result.actualWeightKg, result.actualReps);
    }
  }

  return bestWeightKg < 0 || actualWeightKg > bestWeightKg ||
    (actualWeightKg === bestWeightKg && actualReps > bestReps);
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,
  history: [],
  isHydrated: false,
  error: null,

  hydrate: async () => {
    const [sessionResult, historyResult] = await Promise.all([
      loadValidated(STORAGE_KEYS.activeSession, activeWorkoutSessionSchema),
      loadValidated(STORAGE_KEYS.history, workoutHistorySchema),
    ]);
    const errors: string[] = [];

    if (sessionResult.status === 'invalid' || sessionResult.status === 'error') {
      errors.push('Active workout: ' + sessionResult.error);
    }
    if (historyResult.status === 'invalid' || historyResult.status === 'error') {
      errors.push('History: ' + historyResult.error);
    }

    set({
      activeSession: sessionResult.status === 'loaded' ? sessionResult.data : null,
      history: historyResult.status === 'loaded' ? historyResult.data : [],
      isHydrated: true,
      error: errors.length > 0 ? errors.join('\n') : null,
    });
  },

  startWorkout: async (plan) => {
    const currentSession = get().activeSession;

    if (currentSession && !['completed', 'cancelled'].includes(currentSession.status)) {
      throw new Error('Finish or discard the current workout before starting another');
    }

    const planSnapshot = startableWorkoutPlanSchema.parse(plan);
    const session: WorkoutSession = {
      id: createId(),
      planId: plan.id,
      planSnapshot,
      status: 'active',
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      results: [],
      startedAt: new Date().toISOString(),
      totalPausedMilliseconds: 0,
    };

    await persistActiveSession(session);
    set({ activeSession: session, error: null });
    return session.id;
  },

  startRecordedWorkout: async (dayName) => {
    const currentSession = get().activeSession;
    if (currentSession && !['completed', 'cancelled'].includes(currentSession.status)) {
      throw new Error('Finish or discard the current workout before starting another');
    }

    const name = dayName.trim();
    if (!name || name.length > 80) {
      throw new Error('Day name must be between 1 and 80 characters');
    }

    const now = new Date().toISOString();
    const planId = `recorded-${createId()}`;
    const session: WorkoutSession = {
      id: createId(),
      planId,
      planSnapshot: {
        id: planId,
        name,
        description: 'Recorded without a fixed workout plan.',
        exercises: [],
        createdAt: now,
        updatedAt: now,
      },
      mode: 'recording',
      status: 'active',
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      results: [],
      startedAt: now,
      totalPausedMilliseconds: 0,
    };

    await persistActiveSession(session);
    set({ activeSession: session, error: null });
    return session.id;
  },

  recordManualSet: async (exerciseName, actualWeightKg, actualReps) => {
    const session = get().activeSession;
    if (!session || session.mode !== 'recording') {
      throw new Error('No recorded workout is active');
    }
    if (session.status !== 'active') {
      throw new Error('Finish the current rest before recording another set');
    }

    const name = exerciseName.trim();
    if (!name || name.length > 80) {
      throw new Error('Exercise name must be between 1 and 80 characters');
    }
    if (!Number.isFinite(actualWeightKg) || actualWeightKg < 0 || actualWeightKg > 1000) {
      throw new Error('Weight must be between 0 and 1000 kg');
    }
    if (!Number.isInteger(actualReps) || actualReps < 1 || actualReps > 1000) {
      throw new Error('Repetitions must be a whole number between 1 and 1000');
    }

    const normalizedName = name.toLowerCase();
    const existingExerciseIndex = session.planSnapshot.exercises.findIndex(
      (exercise) => exercise.name.trim().toLowerCase() === normalizedName
    );
    const exerciseId =
      existingExerciseIndex >= 0
        ? session.planSnapshot.exercises[existingExerciseIndex].id
        : createId();
    const setId = createId();
    const resultId = createId();
    const completedAt = new Date().toISOString();
    const workoutSet = {
      id: setId,
      order:
        existingExerciseIndex >= 0
          ? session.planSnapshot.exercises[existingExerciseIndex].sets.length
          : 0,
      type: 'working' as const,
      targetWeightKg: actualWeightKg,
      targetReps: actualReps,
      restSeconds: 0,
    };
    const exercises = [...session.planSnapshot.exercises];
    let currentExerciseIndex = existingExerciseIndex;

    if (existingExerciseIndex >= 0) {
      const exercise = exercises[existingExerciseIndex];
      exercises[existingExerciseIndex] = {
        ...exercise,
        sets: [...exercise.sets, workoutSet],
      };
    } else {
      currentExerciseIndex = exercises.length;
      exercises.push({
        id: exerciseId,
        name,
        defaultRestSeconds: 0,
        order: exercises.length,
        sets: [workoutSet],
      });
    }

    const automaticPersonalRecord = isAutomaticPersonalRecord(
      session,
      get().history,
      name,
      actualWeightKg,
      actualReps
    );
    const activeSession: WorkoutSession = {
      ...session,
      status: 'resting',
      currentExerciseIndex,
      currentSetIndex: workoutSet.order,
      planSnapshot: {
        ...session.planSnapshot,
        exercises,
        updatedAt: completedAt,
      },
      results: [
        ...session.results,
        {
          id: resultId,
          exerciseId,
          setId,
          status: 'completed',
          targetWeightKg: actualWeightKg,
          targetReps: actualReps,
          actualWeightKg,
          actualReps,
          ...(automaticPersonalRecord ? { isPersonalRecord: true } : {}),
          completedAt,
        },
      ],
      restStartedAt: Date.parse(completedAt),
      restEndsAt: undefined,
    };

    await persistActiveSession(activeSession);
    set({ activeSession, error: null });
  },

  finishRecordedWorkout: async () => {
    const session = get().activeSession;
    if (!session || session.mode !== 'recording') {
      throw new Error('No recorded workout is active');
    }
    if (session.results.length === 0) {
      throw new Error('Record at least one set before finishing the workout');
    }

    const completedSession: WorkoutSession = {
      ...session,
      status: 'completed',
      completedAt: new Date().toISOString(),
      restEndsAt: undefined,
      restStartedAt: undefined,
    };
    const history = [completedSession, ...get().history];
    await persistHistory(history);
    await removeStoredValue(STORAGE_KEYS.activeSession);
    set({ activeSession: null, history, error: null });
    return completedSession.id;
  },

  completeCurrentSet: async (actualWeightKg, actualReps, isPersonalRecord = false) => {
    const session = get().activeSession;

    if (!session) {
      throw new Error('No active workout found');
    }
    if (!Number.isFinite(actualWeightKg) || actualWeightKg < 0 || actualWeightKg > 1000) {
      throw new Error('Actual weight must be between 0 and 1000 kg');
    }
    if (!Number.isInteger(actualReps) || actualReps < 0 || actualReps > 1000) {
      throw new Error('Actual repetitions must be a whole number between 0 and 1000');
    }

    return get().recordSet({
      status: 'completed',
      actualWeightKg,
      actualReps,
      isPersonalRecord,
    });
  },

  skipCurrentSet: async () => get().recordSet({ status: 'skipped' }),

  pauseWorkout: async () => {
    const session = get().activeSession;
    if (!session || !['active', 'resting'].includes(session.status)) {
      throw new Error('Only an active or resting workout can be paused');
    }

    const pausedSession = pauseWorkoutSession(session, new Date().toISOString());
    await persistActiveSession(pausedSession);
    set({ activeSession: pausedSession, error: null });
  },

  resumeWorkout: async () => {
    const session = get().activeSession;
    if (!session || session.status !== 'paused' || !session.pausedAt) {
      throw new Error('No paused workout found');
    }

    const resumedSession = resumeWorkoutSession(session, new Date().toISOString());
    await persistActiveSession(resumedSession);
    set({ activeSession: resumedSession, error: null });
  },

  adjustRest: async (adjustmentSeconds) => {
    const session = get().activeSession;
    if (!session) {
      throw new Error('No active workout found');
    }

    const adjustedSession = adjustRestPeriod(session, adjustmentSeconds);
    await persistActiveSession(adjustedSession);
    set({ activeSession: adjustedSession, error: null });
  },

  finishRest: async () => {
    const session = get().activeSession;
    if (!session) {
      throw new Error('No active workout found');
    }

    const activeSession = finishRestPeriod(session);
    await persistActiveSession(activeSession);
    set({ activeSession, error: null });
  },

  addTemporarySets: async (input) => {
    const session = get().activeSession;
    if (!session) {
      throw new Error('No active workout found');
    }

    const activeSession = insertTemporarySets(session, {
      ...input,
      temporaryExerciseId: createId(),
      temporarySetIds: Array.from({ length: input.count }, () => createId()),
      continuationExerciseId: createId(),
    });
    await persistActiveSession(activeSession);
    set({ activeSession, error: null });
  },

  undoLastSet: async () => {
    const session = get().activeSession;
    if (!session) {
      throw new Error('No active workout found');
    }

    const activeSession = undoLastRecordedSet(session);
    await persistActiveSession(activeSession);
    set({ activeSession, error: null });
  },

  cancelWorkout: async () => {
    const session = get().activeSession;
    if (!session) {
      return;
    }

    await removeStoredValue(STORAGE_KEYS.activeSession);
    set({ activeSession: null, error: null });
  },

  saveActiveSession: async (session) => {
    if (session === null) {
      await removeStoredValue(STORAGE_KEYS.activeSession);
    } else {
      await persistActiveSession(session);
    }
    set({ activeSession: session, error: null });
  },

  replaceHistory: async (history) => {
    const validatedHistory = workoutHistorySchema.parse(history);
    await persistHistory(validatedHistory);
    set({ history: validatedHistory, error: null });
  },

  removeHistoryEntry: async (sessionId) => {
    const history = get().history.filter((session) => session.id !== sessionId);
    await persistHistory(history);
    set({ history, error: null });
  },

  recordSet: async (input: SetCompletionInput) => {
    const session = get().activeSession;
    if (!session) {
      throw new Error('No active workout found');
    }

    const completedSet = getCurrentSet(session);
    if (!completedSet) {
      throw new Error('The current workout position is invalid');
    }
    const completedAt = new Date().toISOString();
    const automaticPersonalRecord =
      input.status === 'completed' &&
      input.actualWeightKg !== undefined &&
      input.actualReps !== undefined
        ? isAutomaticPersonalRecord(
            session,
            get().history,
            session.planSnapshot.exercises[session.currentExerciseIndex]?.name ?? '',
            input.actualWeightKg,
            input.actualReps
          )
        : false;
    let nextSession = recordCurrentSet(
      session,
      { ...input, isPersonalRecord: Boolean(input.isPersonalRecord || automaticPersonalRecord) },
      createId(),
      completedAt
    );

    if (nextSession.status === 'completed') {
      const history = [nextSession, ...get().history];
      await persistHistory(history);
      await removeStoredValue(STORAGE_KEYS.activeSession);
      set({ activeSession: null, history, error: null });
      return true;
    }

    if (input.status === 'completed') {
      nextSession = startRestPeriod(
        nextSession,
        completedSet.restSeconds,
        Date.parse(completedAt)
      );
    }

    await persistActiveSession(nextSession);
    set({ activeSession: nextSession, error: null });
    return false;
  },
}));
