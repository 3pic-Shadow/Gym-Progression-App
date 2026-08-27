import type { RecorderDay, WorkoutPlan } from '@/src/models';

export const DEFAULT_RECORD_WORKOUT_DAYS: RecorderDay[] = [
  {
    id: 'recorder-day-chest',
    name: 'Chest Day',
    exercises: ['Bench Press', 'Incline Dumbbell Press', 'Chest Fly', 'Dips'],
  },
  {
    id: 'recorder-day-legs',
    name: 'Leg Day',
    exercises: ['Squats', 'Deadlifts', 'Leg Press', 'Lunges', 'Leg Curls', 'Calf Raises'],
  },
  {
    id: 'recorder-day-back',
    name: 'Back Day',
    exercises: ['Deadlifts', 'Pull-Ups', 'Barbell Rows', 'Lat Pulldowns', 'Seated Cable Rows'],
  },
  {
    id: 'recorder-day-upper',
    name: 'Upper Body Day',
    exercises: [
      'Bench Press',
      'Pull-Ups',
      'Overhead Press',
      'Barbell Rows',
      'Bicep Curls',
      'Tricep Pushdowns',
    ],
  },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function getRecordedWorkoutExerciseOptions(
  dayName: string,
  configuredDays: RecorderDay[],
  plans: WorkoutPlan[]
) {
  const configuredDay = configuredDays.find((day) => normalize(day.name) === normalize(dayName));
  const matchingPlanExercises = plans
    .filter((plan) => normalize(plan.name) === normalize(dayName))
    .flatMap((plan) => plan.exercises.map((exercise) => exercise.name));
  const names = configuredDay ? configuredDay.exercises : matchingPlanExercises;
  const uniqueNames = new Map<string, string>();

  for (const name of names) {
    const key = normalize(name);
    if (key && !uniqueNames.has(key)) {
      uniqueNames.set(key, name.trim());
    }
  }

  return Array.from(uniqueNames.values());
}
