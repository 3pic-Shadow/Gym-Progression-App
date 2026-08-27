import type { SetResult, WorkoutSession } from '@/src/models';

export interface ExerciseSetPerformance {
  sessionId: string;
  planName: string;
  exerciseName: string;
  completedAt: string;
  weightKg: number;
  reps: number;
  volumeKg: number;
  isPersonalRecord: boolean;
}

export interface ExerciseSessionPerformance {
  sessionId: string;
  planName: string;
  completedAt: string;
  sets: ExerciseSetPerformance[];
  volumeKg: number;
  maxWeightKg: number;
  totalReps: number;
}

export interface ExerciseProgressSummary {
  name: string;
  sessions: number;
  completedSets: number;
  totalVolumeKg: number;
  latest?: ExerciseSetPerformance;
  best?: ExerciseSetPerformance;
  savedPersonalRecords: ExerciseSetPerformance[];
}

export interface WeeklyVolume {
  weekStart: string;
  volumeKg: number;
  workouts: number;
  completedSets: number;
}

export interface SessionExerciseVolume {
  name: string;
  normalizedName: string;
  completedSets: number;
  totalReps: number;
  volumeKg: number;
}

export function normalizeExerciseName(name: string) {
  return name.trim().toLocaleLowerCase();
}

export function getResultVolume(result: SetResult) {
  if (
    result.status !== 'completed' ||
    result.actualWeightKg === undefined ||
    result.actualReps === undefined
  ) {
    return 0;
  }

  return result.actualWeightKg * result.actualReps;
}

export function getSessionVolume(session: WorkoutSession) {
  return session.results.reduce((total, result) => total + getResultVolume(result), 0);
}

function getExerciseName(session: WorkoutSession, result: SetResult) {
  const directMatch = session.planSnapshot.exercises.find(
    (exercise) => exercise.id === result.exerciseId
  );
  if (directMatch) {
    return directMatch.name;
  }

  return session.planSnapshot.exercises.find((exercise) =>
    exercise.sets.some((workoutSet) => workoutSet.id === result.setId)
  )?.name;
}

/** Returns volume grouped by exercise so unlike movements are never combined. */
export function getSessionExerciseVolumes(session: WorkoutSession) {
  const groups = new Map<string, SessionExerciseVolume>();

  for (const result of session.results) {
    if (result.status !== 'completed') continue;
    const name = getExerciseName(session, result);
    if (!name) continue;
    const normalizedName = normalizeExerciseName(name);
    const current = groups.get(normalizedName) ?? {
      name,
      normalizedName,
      completedSets: 0,
      totalReps: 0,
      volumeKg: 0,
    };
    groups.set(normalizedName, {
      ...current,
      completedSets: current.completedSets + 1,
      totalReps: current.totalReps + (result.actualReps ?? 0),
      volumeKg: current.volumeKg + getResultVolume(result),
    });
  }

  return Array.from(groups.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export function getExercisePerformances(history: WorkoutSession[]) {
  return history
    .flatMap((session) =>
      session.results.flatMap((result): ExerciseSetPerformance[] => {
        const exerciseName = getExerciseName(session, result);
        if (
          !exerciseName ||
          result.status !== 'completed' ||
          result.actualWeightKg === undefined ||
          result.actualReps === undefined
        ) {
          return [];
        }

        return [
          {
            sessionId: session.id,
            planName: session.planSnapshot.name,
            exerciseName,
            completedAt: result.completedAt,
            weightKg: result.actualWeightKg,
            reps: result.actualReps,
            volumeKg: getResultVolume(result),
            isPersonalRecord: Boolean(result.isPersonalRecord),
          },
        ];
      })
    )
    .sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt));
}

export function getExerciseProgressSummaries(history: WorkoutSession[]) {
  const groups = new Map<string, ExerciseSetPerformance[]>();

  for (const performance of getExercisePerformances(history)) {
    const key = normalizeExerciseName(performance.exerciseName);
    groups.set(key, [...(groups.get(key) ?? []), performance]);
  }

  return Array.from(groups.values())
    .map((performances): ExerciseProgressSummary => {
      const best = [...performances].sort(
        (left, right) => right.weightKg - left.weightKg || right.reps - left.reps
      )[0];
      return {
        name: performances[0].exerciseName,
        sessions: new Set(performances.map((item) => item.sessionId)).size,
        completedSets: performances.length,
        totalVolumeKg: performances.reduce((total, item) => total + item.volumeKg, 0),
        latest: performances[0],
        best,
        savedPersonalRecords: performances.filter((item) => item.isPersonalRecord),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function getExerciseSessionHistory(history: WorkoutSession[], exerciseName: string) {
  const key = normalizeExerciseName(exerciseName);
  const performances = getExercisePerformances(history).filter(
    (performance) => normalizeExerciseName(performance.exerciseName) === key
  );
  const sessions = new Map<string, ExerciseSetPerformance[]>();

  for (const performance of performances) {
    sessions.set(performance.sessionId, [
      ...(sessions.get(performance.sessionId) ?? []),
      performance,
    ]);
  }

  return Array.from(sessions.values())
    .map((sets): ExerciseSessionPerformance => ({
      sessionId: sets[0].sessionId,
      planName: sets[0].planName,
      completedAt: sets[0].completedAt,
      sets: [...sets].sort(
        (left, right) => Date.parse(left.completedAt) - Date.parse(right.completedAt)
      ),
      volumeKg: sets.reduce((total, item) => total + item.volumeKg, 0),
      maxWeightKg: Math.max(...sets.map((item) => item.weightKg)),
      totalReps: sets.reduce((total, item) => total + item.reps, 0),
    }))
    .sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt));
}

function getWeekStart(value: string | number | Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

function getLocalDateKey(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');
}

export function getWeeklyVolumes(
  history: WorkoutSession[],
  numberOfWeeks = 6,
  now: string | number | Date = Date.now()
) {
  const currentWeekStart = getWeekStart(now);
  const weeks: WeeklyVolume[] = [];

  for (let offset = numberOfWeeks - 1; offset >= 0; offset -= 1) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() - offset * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const sessions = history.filter((session) => {
      const completedAt = Date.parse(session.completedAt ?? session.startedAt);
      return completedAt >= weekStart.getTime() && completedAt < weekEnd.getTime();
    });

    weeks.push({
      weekStart: getLocalDateKey(weekStart),
      volumeKg: sessions.reduce((total, session) => total + getSessionVolume(session), 0),
      workouts: sessions.length,
      completedSets: sessions.reduce(
        (total, session) =>
          total + session.results.filter((result) => result.status === 'completed').length,
        0
      ),
    });
  }

  return weeks;
}

export function getExerciseWeeklyVolumes(
  history: WorkoutSession[],
  exerciseName: string,
  numberOfWeeks = 6,
  now: string | number | Date = Date.now()
) {
  const key = normalizeExerciseName(exerciseName);
  const currentWeekStart = getWeekStart(now);
  const performances = getExercisePerformances(history).filter(
    (performance) => normalizeExerciseName(performance.exerciseName) === key
  );
  const weeks: WeeklyVolume[] = [];

  for (let offset = numberOfWeeks - 1; offset >= 0; offset -= 1) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() - offset * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekPerformances = performances.filter((performance) => {
      const completedAt = Date.parse(performance.completedAt);
      return completedAt >= weekStart.getTime() && completedAt < weekEnd.getTime();
    });

    weeks.push({
      weekStart: getLocalDateKey(weekStart),
      volumeKg: weekPerformances.reduce((total, performance) => total + performance.volumeKg, 0),
      workouts: new Set(weekPerformances.map((performance) => performance.sessionId)).size,
      completedSets: weekPerformances.length,
    });
  }

  return weeks;
}

export function formatVolume(volumeKg: number) {
  return `${Math.round(volumeKg).toLocaleString()} kg`;
}
