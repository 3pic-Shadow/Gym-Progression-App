import type { WorkoutPlan } from '@/src/models';

export interface PlanMetrics {
  exerciseCount: number;
  setCount: number;
}

export function getPlanMetrics(plan: WorkoutPlan): PlanMetrics {
  const sets = plan.exercises.flatMap((exercise) => exercise.sets);

  return {
    exerciseCount: plan.exercises.length,
    setCount: sets.length,
  };
}
