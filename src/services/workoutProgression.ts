import type {
  Exercise,
  SetResult,
  SetResultStatus,
  WorkoutSession,
  WorkoutSet,
} from '@/src/models';

export interface SetCompletionInput {
  status: SetResultStatus;
  actualWeightKg?: number;
  actualReps?: number;
  isPersonalRecord?: boolean;
}

export interface WorkoutProgress {
  completedSets: number;
  totalSets: number;
  exerciseCompletedSets: number;
  exerciseTotalSets: number;
}

export interface TemporarySetsInput {
  sourceExerciseId?: string;
  exerciseName?: string;
  count: 1 | 2;
  defaultRestSeconds: number;
  temporaryExerciseId: string;
  temporarySetIds: string[];
  continuationExerciseId: string;
  targetWeightKg: number;
  targetReps: number;
  restSeconds: number;
}

export interface UpcomingSet {
  exercise: Exercise;
  workoutSet: WorkoutSet;
  exerciseIndex: number;
  setIndex: number;
}

export function getCurrentExercise(session: WorkoutSession) {
  return session.planSnapshot.exercises[session.currentExerciseIndex];
}

export function getCurrentSet(session: WorkoutSession) {
  return getCurrentExercise(session)?.sets[session.currentSetIndex];
}

export function getWorkoutProgress(session: WorkoutSession): WorkoutProgress {
  const exercise = getCurrentExercise(session);
  const completedSetIds = new Set(session.results.map((result) => result.setId));

  return {
    completedSets: session.results.length,
    totalSets: session.planSnapshot.exercises.reduce(
      (total, planExercise) => total + planExercise.sets.length,
      0
    ),
    exerciseCompletedSets:
      exercise?.sets.filter((workoutSet) => completedSetIds.has(workoutSet.id)).length ?? 0,
    exerciseTotalSets: exercise?.sets.length ?? 0,
  };
}

export function getUpcomingSets(session: WorkoutSession, limit = 3): UpcomingSet[] {
  const upcoming: UpcomingSet[] = [];

  for (
    let exerciseIndex = session.currentExerciseIndex;
    exerciseIndex < session.planSnapshot.exercises.length && upcoming.length < limit;
    exerciseIndex += 1
  ) {
    const exercise = session.planSnapshot.exercises[exerciseIndex];
    const firstSetIndex =
      exerciseIndex === session.currentExerciseIndex ? session.currentSetIndex : 0;

    for (
      let setIndex = firstSetIndex;
      setIndex < exercise.sets.length && upcoming.length < limit;
      setIndex += 1
    ) {
      upcoming.push({
        exercise,
        workoutSet: exercise.sets[setIndex],
        exerciseIndex,
        setIndex,
      });
    }
  }

  return upcoming;
}

function getNextPosition(session: WorkoutSession) {
  const exercise = getCurrentExercise(session);

  if (session.currentSetIndex + 1 < exercise.sets.length) {
    return {
      currentExerciseIndex: session.currentExerciseIndex,
      currentSetIndex: session.currentSetIndex + 1,
    };
  }

  if (session.currentExerciseIndex + 1 < session.planSnapshot.exercises.length) {
    return {
      currentExerciseIndex: session.currentExerciseIndex + 1,
      currentSetIndex: 0,
    };
  }

  return null;
}

export function recordCurrentSet(
  session: WorkoutSession,
  input: SetCompletionInput,
  resultId: string,
  completedAt: string
): WorkoutSession {
  if (session.status !== 'active') {
    throw new Error('Only an active workout can record a set');
  }

  const exercise = getCurrentExercise(session);
  const workoutSet = getCurrentSet(session);

  if (!exercise || !workoutSet) {
    throw new Error('The current workout position is invalid');
  }
  if (session.results.some((result) => result.setId === workoutSet.id)) {
    throw new Error('This set has already been recorded');
  }

  const result: SetResult = {
    id: resultId,
    exerciseId: exercise.id,
    setId: workoutSet.id,
    status: input.status,
    targetWeightKg: workoutSet.targetWeightKg,
    targetReps: workoutSet.targetReps,
    actualWeightKg: input.status === 'completed' ? input.actualWeightKg : undefined,
    actualReps: input.status === 'completed' ? input.actualReps : undefined,
    ...(input.status === 'completed' && input.isPersonalRecord
      ? { isPersonalRecord: true }
      : {}),
    completedAt,
  };
  const nextPosition = getNextPosition(session);

  if (!nextPosition) {
    return {
      ...session,
      status: 'completed',
      results: [...session.results, result],
      completedAt,
    };
  }

  return {
    ...session,
    ...nextPosition,
    results: [...session.results, result],
  };
}

export function startRestPeriod(
  session: WorkoutSession,
  restSeconds: number,
  startedAt: number
): WorkoutSession {
  if (session.status !== 'active' || restSeconds <= 0) {
    return session;
  }

  return {
    ...session,
    status: 'resting',
    restEndsAt: startedAt + restSeconds * 1000,
  };
}

export function finishRestPeriod(session: WorkoutSession): WorkoutSession {
  if (session.status !== 'resting') {
    throw new Error('No rest period is active');
  }

  return {
    ...session,
    status: 'active',
    restEndsAt: undefined,
    restStartedAt: undefined,
  };
}

export function insertTemporarySets(
  session: WorkoutSession,
  input: TemporarySetsInput
): WorkoutSession {
  const pausedDuringRest =
    session.status === 'paused' && session.pausedFromStatus === 'resting';
  if (session.status !== 'resting' && !pausedDuringRest) {
    throw new Error('Sets can only be added during a rest period');
  }
  if (input.temporarySetIds.length !== input.count) {
    throw new Error('Every temporary set requires an identifier');
  }

  const exercises = session.planSnapshot.exercises;
  const sourceExerciseIndex = input.sourceExerciseId
    ? exercises.findIndex((exercise) => exercise.id === input.sourceExerciseId)
    : -1;
  const sourceExercise =
    sourceExerciseIndex >= 0 ? exercises[sourceExerciseIndex] : undefined;

  if (input.sourceExerciseId && !sourceExercise) {
    throw new Error('Exercise not found');
  }

  const customName = input.exerciseName?.trim();
  if (!sourceExercise && (!customName || customName.length > 80)) {
    throw new Error('Exercise name must be between 1 and 80 characters');
  }
  if (
    !Number.isInteger(input.defaultRestSeconds) ||
    input.defaultRestSeconds < 0 ||
    input.defaultRestSeconds > 3600
  ) {
    throw new Error('Default rest must be between 0 and 3600 seconds');
  }
  if (
    !Number.isFinite(input.targetWeightKg) ||
    input.targetWeightKg < 0 ||
    input.targetWeightKg > 1000
  ) {
    throw new Error('Target weight must be between 0 and 1000 kg');
  }
  if (!Number.isInteger(input.targetReps) || input.targetReps < 1 || input.targetReps > 1000) {
    throw new Error('Target repetitions must be a whole number between 1 and 1000');
  }
  if (!Number.isInteger(input.restSeconds) || input.restSeconds < 0 || input.restSeconds > 3600) {
    throw new Error('Rest must be a whole number between 0 and 3600 seconds');
  }

  const templateSet = sourceExercise?.sets[sourceExercise.sets.length - 1];
  if (sourceExercise && !templateSet) {
    throw new Error('The selected exercise has no set to copy');
  }

  const sets = input.temporarySetIds.map((id, order) => ({
    id,
    order,
    type: templateSet?.type ?? ('working' as const),
    targetWeightKg: input.targetWeightKg,
    targetReps: input.targetReps,
    restSeconds: input.restSeconds,
    notes: templateSet?.notes,
  }));
  const currentExercise = getCurrentExercise(session);
  const currentSet = getCurrentSet(session);
  if (!currentExercise || !currentSet) {
    throw new Error('The current workout position is invalid');
  }

  const completedCurrentSets = currentExercise.sets.slice(0, session.currentSetIndex);
  const pendingCurrentSets = currentExercise.sets
    .slice(session.currentSetIndex)
    .map((workoutSet, order) => ({ ...workoutSet, order }));
  const exercisesBeforeCurrent = exercises.slice(0, session.currentExerciseIndex);
  const exercisesAfterCurrent = exercises.slice(session.currentExerciseIndex + 1);
  const temporaryExercise = {
    id: input.temporaryExerciseId,
    name: sourceExercise?.name ?? customName!,
    notes: sourceExercise?.notes,
    defaultRestSeconds:
      sourceExercise?.defaultRestSeconds ?? input.defaultRestSeconds,
    sets,
    order: 0,
  };
  const continuationExercise = {
    ...currentExercise,
    id:
      completedCurrentSets.length > 0
        ? input.continuationExerciseId
        : currentExercise.id,
    sets: pendingCurrentSets,
    order: 0,
  };
  const executionSegment =
    completedCurrentSets.length > 0
      ? [
          { ...currentExercise, sets: completedCurrentSets, order: 0 },
          temporaryExercise,
          continuationExercise,
        ]
      : [temporaryExercise, continuationExercise];
  const nextExercises = [
    ...exercisesBeforeCurrent,
    ...executionSegment,
    ...exercisesAfterCurrent,
  ].map((exercise, order) => ({ ...exercise, order }));

  return {
    ...session,
    currentExerciseIndex:
      exercisesBeforeCurrent.length + (completedCurrentSets.length > 0 ? 1 : 0),
    currentSetIndex: 0,
    planSnapshot: {
      ...session.planSnapshot,
      exercises: nextExercises,
    },
  };
}

export function undoLastRecordedSet(session: WorkoutSession): WorkoutSession {
  if (session.status !== 'resting') {
    throw new Error('The previous set can only be undone during rest');
  }

  const lastResult = session.results[session.results.length - 1];
  if (!lastResult) {
    throw new Error('No recorded set is available to undo');
  }

  for (let exerciseIndex = 0; exerciseIndex < session.planSnapshot.exercises.length; exerciseIndex += 1) {
    const exercise = session.planSnapshot.exercises[exerciseIndex];
    const setIndex = exercise.sets.findIndex((workoutSet) => workoutSet.id === lastResult.setId);

    if (setIndex >= 0) {
      return {
        ...session,
        status: 'active',
        currentExerciseIndex: exerciseIndex,
        currentSetIndex: setIndex,
        results: session.results.slice(0, -1),
        restEndsAt: undefined,
      };
    }
  }

  throw new Error('The previous set is no longer in this workout');
}

export function adjustRestPeriod(
  session: WorkoutSession,
  adjustmentSeconds: number,
  adjustedAt = Date.now()
): WorkoutSession {
  if (session.status !== 'resting' || session.restEndsAt === undefined) {
    throw new Error('No rest period is active');
  }
  if (!Number.isFinite(adjustmentSeconds)) {
    throw new Error('Rest adjustment must be a finite number');
  }

  const adjustedEnd = Math.max(adjustedAt, session.restEndsAt + adjustmentSeconds * 1000);

  if (adjustedEnd === adjustedAt) {
    return finishRestPeriod(session);
  }

  return {
    ...session,
    restEndsAt: adjustedEnd,
  };
}

export function pauseWorkoutSession(
  session: WorkoutSession,
  pausedAt: string
): WorkoutSession {
  if (session.status !== 'active' && session.status !== 'resting') {
    throw new Error('Only an active or resting workout can be paused');
  }

  const pausedTimestamp = Date.parse(pausedAt);
  const pausedFromStatus = session.status;
  const pausedRestMilliseconds =
    pausedFromStatus === 'resting' && session.restEndsAt !== undefined
      ? Math.max(0, session.restEndsAt - pausedTimestamp)
      : undefined;

  return {
    ...session,
    status: 'paused',
    pausedAt,
    pausedFromStatus,
    pausedRestMilliseconds,
    restEndsAt: undefined,
  };
}

export function resumeWorkoutSession(
  session: WorkoutSession,
  resumedAt: string
): WorkoutSession {
  if (session.status !== 'paused' || !session.pausedAt) {
    throw new Error('No paused workout found');
  }

  const resumedTimestamp = Date.parse(resumedAt);
  const pausedMilliseconds = Math.max(0, resumedTimestamp - Date.parse(session.pausedAt));
  const shouldResumeRest =
    session.pausedFromStatus === 'resting' &&
    session.pausedRestMilliseconds !== undefined &&
    session.pausedRestMilliseconds > 0;

  return {
    ...session,
    status: shouldResumeRest ? 'resting' : 'active',
    pausedAt: undefined,
    pausedFromStatus: undefined,
    pausedRestMilliseconds: undefined,
    totalPausedMilliseconds: session.totalPausedMilliseconds + pausedMilliseconds,
    restEndsAt: shouldResumeRest
      ? resumedTimestamp + session.pausedRestMilliseconds!
      : undefined,
  };
}
