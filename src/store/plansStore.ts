import { create } from 'zustand';

import { STORAGE_KEYS } from '@/src/constants/storage';
import { createSeedPlans } from '@/src/data/seedPlans';
import type { Exercise, SetType, WorkoutPlan, WorkoutSet } from '@/src/models';
import { loadValidated, saveValidated } from '@/src/services/persistence';
import { createId } from '@/src/utils/id';
import {
  exerciseInputSchema,
  workoutPlanInputSchema,
  workoutPlanSchema,
  workoutPlansSchema,
  workoutSetInputSchema,
} from '@/src/validation';

import { getErrorMessage } from './storeUtils';

export interface PlanInput {
  name: string;
  description?: string;
}

export interface ExerciseInput {
  name: string;
  notes?: string;
  defaultRestSeconds: number;
}

export interface WorkoutSetInput {
  type: SetType;
  targetWeightKg: number;
  targetReps: number;
  restSeconds: number;
  notes?: string;
}

type MoveDirection = 'up' | 'down';

interface PlansState {
  plans: WorkoutPlan[];
  isHydrated: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  replacePlans: (plans: WorkoutPlan[]) => Promise<void>;
  upsertPlan: (plan: WorkoutPlan) => Promise<void>;
  createPlan: (input: PlanInput) => Promise<string>;
  updatePlan: (planId: string, input: PlanInput) => Promise<void>;
  duplicatePlan: (planId: string) => Promise<string>;
  removePlan: (planId: string) => Promise<void>;
  movePlan: (planId: string, direction: MoveDirection) => Promise<void>;
  createExercise: (planId: string, input: ExerciseInput) => Promise<string>;
  updateExercise: (planId: string, exerciseId: string, input: ExerciseInput) => Promise<void>;
  duplicateExercise: (planId: string, exerciseId: string) => Promise<string>;
  removeExercise: (planId: string, exerciseId: string) => Promise<void>;
  moveExercise: (planId: string, exerciseId: string, direction: MoveDirection) => Promise<void>;
  createSet: (planId: string, exerciseId: string, input: WorkoutSetInput) => Promise<string>;
  updateSet: (
    planId: string,
    exerciseId: string,
    setId: string,
    input: WorkoutSetInput
  ) => Promise<void>;
  duplicateSet: (planId: string, exerciseId: string, setId: string) => Promise<string>;
  removeSet: (planId: string, exerciseId: string, setId: string) => Promise<void>;
  moveSet: (
    planId: string,
    exerciseId: string,
    setId: string,
    direction: MoveDirection
  ) => Promise<void>;
}

function optionalText(value: string | undefined) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}

function copyName(name: string) {
  const suffix = ' copy';
  return name.slice(0, 80 - suffix.length).trimEnd() + suffix;
}

function normalizeOrders<T extends { order: number }>(items: T[]) {
  return items.map((item, order) => ({ ...item, order }));
}

function moveItem<T extends { id: string; order: number }>(
  items: T[],
  itemId: string,
  direction: MoveDirection
) {
  const currentIndex = items.findIndex((item) => item.id === itemId);
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  [nextItems[currentIndex], nextItems[targetIndex]] = [
    nextItems[targetIndex],
    nextItems[currentIndex],
  ];
  return normalizeOrders(nextItems);
}

function updatePlanInList(
  plans: WorkoutPlan[],
  planId: string,
  update: (plan: WorkoutPlan) => WorkoutPlan
) {
  let found = false;
  const nextPlans = plans.map((plan) => {
    if (plan.id !== planId) {
      return plan;
    }

    found = true;
    return { ...update(plan), updatedAt: new Date().toISOString() };
  });

  if (!found) {
    throw new Error('Workout plan not found');
  }

  return nextPlans;
}

function updateExerciseInPlan(
  plan: WorkoutPlan,
  exerciseId: string,
  update: (exercise: Exercise) => Exercise
) {
  let found = false;
  const exercises = plan.exercises.map((exercise) => {
    if (exercise.id !== exerciseId) {
      return exercise;
    }

    found = true;
    return update(exercise);
  });

  if (!found) {
    throw new Error('Exercise not found');
  }

  return { ...plan, exercises };
}

async function persistPlans(plans: WorkoutPlan[]) {
  await saveValidated(STORAGE_KEYS.plans, plans, workoutPlansSchema);
}

async function commitPlans(
  plans: WorkoutPlan[],
  set: (partial: Partial<PlansState>) => void
) {
  const validatedPlans = workoutPlansSchema.parse(plans);
  await persistPlans(validatedPlans);
  set({ plans: validatedPlans, error: null });
}

export const usePlansStore = create<PlansState>((set, get) => ({
  plans: [],
  isHydrated: false,
  error: null,

  hydrate: async () => {
    const result = await loadValidated(STORAGE_KEYS.plans, workoutPlansSchema);

    if (result.status === 'loaded') {
      set({ plans: result.data, isHydrated: true, error: null });
      return;
    }

    if (result.status === 'empty') {
      const plans = createSeedPlans();

      try {
        await persistPlans(plans);
        set({ plans, isHydrated: true, error: null });
      } catch (error) {
        set({ plans, isHydrated: true, error: getErrorMessage(error) });
      }
      return;
    }

    set({
      plans: [],
      isHydrated: true,
      error: 'Saved workout plans could not be loaded. ' + result.error,
    });
  },

  replacePlans: async (plans) => {
    await commitPlans(plans, set);
  },

  upsertPlan: async (plan) => {
    const validatedPlan = workoutPlanSchema.parse(plan);
    const currentPlans = get().plans;
    const existingIndex = currentPlans.findIndex((item) => item.id === validatedPlan.id);
    const nextPlans = [...currentPlans];

    if (existingIndex >= 0) {
      nextPlans[existingIndex] = validatedPlan;
    } else {
      nextPlans.push(validatedPlan);
    }

    await commitPlans(nextPlans, set);
  },

  createPlan: async (input) => {
    const validatedInput = workoutPlanInputSchema.parse({
      ...input,
      description: optionalText(input.description),
    });
    const now = new Date().toISOString();
    const plan: WorkoutPlan = {
      id: createId(),
      name: validatedInput.name,
      description: validatedInput.description,
      exercises: [],
      createdAt: now,
      updatedAt: now,
    };

    await commitPlans([...get().plans, plan], set);
    return plan.id;
  },

  updatePlan: async (planId, input) => {
    const validatedInput = workoutPlanInputSchema.parse({
      ...input,
      description: optionalText(input.description),
    });
    const nextPlans = updatePlanInList(get().plans, planId, (plan) => ({
      ...plan,
      ...validatedInput,
    }));
    await commitPlans(nextPlans, set);
  },

  duplicatePlan: async (planId) => {
    const sourcePlan = get().plans.find((plan) => plan.id === planId);

    if (!sourcePlan) {
      throw new Error('Workout plan not found');
    }

    const now = new Date().toISOString();
    const duplicate: WorkoutPlan = {
      ...sourcePlan,
      id: createId(),
      name: copyName(sourcePlan.name),
      createdAt: now,
      updatedAt: now,
      exercises: sourcePlan.exercises.map((exercise, order) => ({
        ...exercise,
        id: createId(),
        order,
        sets: exercise.sets.map((workoutSet, setOrder) => ({
          ...workoutSet,
          id: createId(),
          order: setOrder,
        })),
      })),
    };

    await commitPlans([...get().plans, duplicate], set);
    return duplicate.id;
  },

  removePlan: async (planId) => {
    const nextPlans = get().plans.filter((plan) => plan.id !== planId);
    await commitPlans(nextPlans, set);
  },

  movePlan: async (planId, direction) => {
    const currentPlans = get().plans;
    const currentIndex = currentPlans.findIndex((plan) => plan.id === planId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= currentPlans.length) {
      return;
    }

    const nextPlans = [...currentPlans];
    [nextPlans[currentIndex], nextPlans[targetIndex]] = [
      nextPlans[targetIndex],
      nextPlans[currentIndex],
    ];
    await commitPlans(nextPlans, set);
  },

  createExercise: async (planId, input) => {
    const validatedInput = exerciseInputSchema.parse({
      ...input,
      notes: optionalText(input.notes),
    });
    const exerciseId = createId();
    const nextPlans = updatePlanInList(get().plans, planId, (plan) => ({
      ...plan,
      exercises: [
        ...plan.exercises,
        {
          id: exerciseId,
          ...validatedInput,
          sets: [],
          order: plan.exercises.length,
        },
      ],
    }));
    await commitPlans(nextPlans, set);
    return exerciseId;
  },

  updateExercise: async (planId, exerciseId, input) => {
    const validatedInput = exerciseInputSchema.parse({
      ...input,
      notes: optionalText(input.notes),
    });
    const nextPlans = updatePlanInList(get().plans, planId, (plan) =>
      updateExerciseInPlan(plan, exerciseId, (exercise) => ({
        ...exercise,
        ...validatedInput,
      }))
    );
    await commitPlans(nextPlans, set);
  },

  duplicateExercise: async (planId, exerciseId) => {
    const duplicateId = createId();
    const nextPlans = updatePlanInList(get().plans, planId, (plan) => {
      const sourceExercise = plan.exercises.find((exercise) => exercise.id === exerciseId);

      if (!sourceExercise) {
        throw new Error('Exercise not found');
      }

      const duplicate: Exercise = {
        ...sourceExercise,
        id: duplicateId,
        name: copyName(sourceExercise.name),
        order: plan.exercises.length,
        sets: sourceExercise.sets.map((workoutSet, order) => ({
          ...workoutSet,
          id: createId(),
          order,
        })),
      };

      return { ...plan, exercises: [...plan.exercises, duplicate] };
    });
    await commitPlans(nextPlans, set);
    return duplicateId;
  },

  removeExercise: async (planId, exerciseId) => {
    const nextPlans = updatePlanInList(get().plans, planId, (plan) => ({
      ...plan,
      exercises: normalizeOrders(plan.exercises.filter((exercise) => exercise.id !== exerciseId)),
    }));
    await commitPlans(nextPlans, set);
  },

  moveExercise: async (planId, exerciseId, direction) => {
    const nextPlans = updatePlanInList(get().plans, planId, (plan) => ({
      ...plan,
      exercises: moveItem(plan.exercises, exerciseId, direction),
    }));
    await commitPlans(nextPlans, set);
  },

  createSet: async (planId, exerciseId, input) => {
    const validatedInput = workoutSetInputSchema.parse({
      ...input,
      notes: optionalText(input.notes),
    });
    const setId = createId();
    const nextPlans = updatePlanInList(get().plans, planId, (plan) =>
      updateExerciseInPlan(plan, exerciseId, (exercise) => ({
        ...exercise,
        sets: [
          ...exercise.sets,
          { id: setId, ...validatedInput, order: exercise.sets.length },
        ],
      }))
    );
    await commitPlans(nextPlans, set);
    return setId;
  },

  updateSet: async (planId, exerciseId, setId, input) => {
    const validatedInput = workoutSetInputSchema.parse({
      ...input,
      notes: optionalText(input.notes),
    });
    const nextPlans = updatePlanInList(get().plans, planId, (plan) =>
      updateExerciseInPlan(plan, exerciseId, (exercise) => {
        let found = false;
        const sets = exercise.sets.map((workoutSet) => {
          if (workoutSet.id !== setId) {
            return workoutSet;
          }

          found = true;
          return { ...workoutSet, ...validatedInput };
        });

        if (!found) {
          throw new Error('Workout set not found');
        }

        return { ...exercise, sets };
      })
    );
    await commitPlans(nextPlans, set);
  },

  duplicateSet: async (planId, exerciseId, setId) => {
    const duplicateId = createId();
    const nextPlans = updatePlanInList(get().plans, planId, (plan) =>
      updateExerciseInPlan(plan, exerciseId, (exercise) => {
        const sourceSet = exercise.sets.find((workoutSet) => workoutSet.id === setId);

        if (!sourceSet) {
          throw new Error('Workout set not found');
        }

        const duplicate: WorkoutSet = {
          ...sourceSet,
          id: duplicateId,
          order: exercise.sets.length,
        };
        return { ...exercise, sets: [...exercise.sets, duplicate] };
      })
    );
    await commitPlans(nextPlans, set);
    return duplicateId;
  },

  removeSet: async (planId, exerciseId, setId) => {
    const nextPlans = updatePlanInList(get().plans, planId, (plan) =>
      updateExerciseInPlan(plan, exerciseId, (exercise) => ({
        ...exercise,
        sets: normalizeOrders(exercise.sets.filter((workoutSet) => workoutSet.id !== setId)),
      }))
    );
    await commitPlans(nextPlans, set);
  },

  moveSet: async (planId, exerciseId, setId, direction) => {
    const nextPlans = updatePlanInList(get().plans, planId, (plan) =>
      updateExerciseInPlan(plan, exerciseId, (exercise) => ({
        ...exercise,
        sets: moveItem(exercise.sets, setId, direction),
      }))
    );
    await commitPlans(nextPlans, set);
  },
}));
