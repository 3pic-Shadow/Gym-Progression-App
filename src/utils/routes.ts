import type { Href } from 'expo-router';

export const routes = {
  home: '/home' as Href,
  plans: '/plans' as Href,
  progress: '/progress' as Href,
  settings: '/settings' as Href,
  history: '/settings/history' as Href,
  recorderSettings: '/settings/recorder' as Href,
  historySession: (sessionId: string, summary = false) =>
    ({
      pathname: '/settings/history/[sessionId]',
      params: { sessionId, ...(summary ? { summary: 'true' } : {}) },
    }) as unknown as Href,
  exerciseProgress: (exerciseName: string) =>
    ({
      pathname: '/progress/[exerciseName]',
      params: { exerciseName },
    }) as unknown as Href,
  recordWorkoutSetup: '/record' as Href,
  recordWorkout: (sessionId: string) =>
    ({ pathname: '/record/[sessionId]', params: { sessionId } }) as unknown as Href,
  workout: (sessionId: string) =>
    ({ pathname: '/workout/[sessionId]', params: { sessionId } }) as unknown as Href,
  newPlan: '/plans/new' as Href,
  plan: (planId: string) =>
    ({ pathname: '/plans/[planId]', params: { planId } }) as unknown as Href,
  editPlan: (planId: string) =>
    ({ pathname: '/plans/[planId]/edit', params: { planId } }) as unknown as Href,
  newExercise: (planId: string) =>
    ({ pathname: '/plans/[planId]/exercise/new', params: { planId } }) as unknown as Href,
  exercise: (planId: string, exerciseId: string) =>
    ({
      pathname: '/plans/[planId]/exercise/[exerciseId]',
      params: { planId, exerciseId },
    }) as unknown as Href,
  editExercise: (planId: string, exerciseId: string) =>
    ({
      pathname: '/plans/[planId]/exercise/[exerciseId]/edit',
      params: { planId, exerciseId },
    }) as unknown as Href,
  newSet: (planId: string, exerciseId: string) =>
    ({
      pathname: '/plans/[planId]/exercise/[exerciseId]/set/new',
      params: { planId, exerciseId },
    }) as unknown as Href,
  editSet: (planId: string, exerciseId: string, setId: string) =>
    ({
      pathname: '/plans/[planId]/exercise/[exerciseId]/set/[setId]',
      params: { planId, exerciseId, setId },
    }) as unknown as Href,
};
