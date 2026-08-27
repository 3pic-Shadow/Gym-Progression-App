import type { WorkoutSession } from '@/src/models';

export interface SessionExerciseVolume {
  name: string;
  normalizedName: string;
  completedSets: number;
  totalReps: number;
  volumeKg: number;
}

export interface SessionSummary {
  completedSets: number;
  skippedSets: number;
  durationMilliseconds: number;
  totalVolumeKg: number;
  exerciseVolumes: SessionExerciseVolume[];
  personalRecords: number;
}

export function getSessionSummary(session: WorkoutSession): SessionSummary {
  const completedSets = session.results.filter((result) => result.status === 'completed').length;
  const completedAt = session.completedAt ? Date.parse(session.completedAt) : Date.now();
  const durationMilliseconds = Math.max(
    0,
    completedAt - Date.parse(session.startedAt) - session.totalPausedMilliseconds
  );

  const exerciseVolumeGroups = new Map<string, SessionExerciseVolume>();
  for (const result of session.results) {
    if (result.status !== 'completed') continue;
    const exercise = session.planSnapshot.exercises.find(
      (item) =>
        item.id === result.exerciseId || item.sets.some((workoutSet) => workoutSet.id === result.setId)
    );
    if (!exercise) continue;
    const normalizedName = exercise.name.trim().toLowerCase();
    const current = exerciseVolumeGroups.get(normalizedName) ?? {
      name: exercise.name,
      normalizedName,
      completedSets: 0,
      totalReps: 0,
      volumeKg: 0,
    };
    exerciseVolumeGroups.set(normalizedName, {
      ...current,
      completedSets: current.completedSets + 1,
      totalReps: current.totalReps + (result.actualReps ?? 0),
      volumeKg:
        current.volumeKg + (result.actualWeightKg ?? 0) * (result.actualReps ?? 0),
    });
  }
  const exerciseVolumes = Array.from(exerciseVolumeGroups.values()).sort((left, right) =>
    left.name.localeCompare(right.name)
  );

  return {
    completedSets,
    skippedSets: session.results.length - completedSets,
    durationMilliseconds,
    totalVolumeKg: exerciseVolumes.reduce((total, exercise) => total + exercise.volumeKg, 0),
    exerciseVolumes,
    personalRecords: session.results.filter((result) => result.isPersonalRecord).length,
  };
}

export function formatSessionDuration(durationMilliseconds: number) {
  const totalMinutes = Math.max(1, Math.round(durationMilliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${totalMinutes} min`;
  }
  if (minutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${minutes} min`;
}
