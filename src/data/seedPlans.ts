import type { Exercise, WorkoutPlan, WorkoutSet } from '@/src/models';

const SEED_CREATED_AT = '2026-01-01T00:00:00.000Z';

function makeSet(
  id: string,
  order: number,
  targetWeightKg: number,
  targetReps: number,
  restSeconds: number,
  type: WorkoutSet['type'] = 'working'
): WorkoutSet {
  return { id, order, type, targetWeightKg, targetReps, restSeconds };
}

const seedExercises: Exercise[] = [
  {
    id: 'seed-exercise-squats',
    name: 'Squats',
    notes: 'Brace before each repetition and keep a controlled tempo.',
    defaultRestSeconds: 90,
    order: 0,
    sets: [
      makeSet('seed-squat-set-1', 0, 40, 8, 60, 'warmup'),
      makeSet('seed-squat-set-2', 1, 50, 8, 60),
      makeSet('seed-squat-set-3', 2, 50, 8, 60),
      makeSet('seed-squat-set-4', 3, 60, 8, 90),
      makeSet('seed-squat-set-5', 4, 60, 8, 90),
    ],
  },
  {
    id: 'seed-exercise-deadlifts',
    name: 'Deadlifts',
    defaultRestSeconds: 90,
    order: 1,
    sets: [
      makeSet('seed-deadlift-set-1', 0, 40, 8, 90, 'warmup'),
      makeSet('seed-deadlift-set-2', 1, 60, 6, 90),
      makeSet('seed-deadlift-set-3', 2, 70, 5, 120),
    ],
  },
];

export function createSeedPlans(): WorkoutPlan[] {
  return [
    {
      id: 'seed-plan-leg-day',
      name: 'Leg Day',
      description: 'A starter lower-body workout. Edit it to match your training.',
      createdAt: SEED_CREATED_AT,
      updatedAt: SEED_CREATED_AT,
      exercises: seedExercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({ ...set })),
      })),
    },
  ];
}
