import { Stack, router, useLocalSearchParams } from 'expo-router';

import { WorkoutSetForm } from '@/src/components/forms/WorkoutSetForm';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ScreenMessage } from '@/src/components/ui/ScreenMessage';
import { usePlansStore } from '@/src/store';

export default function EditSetScreen() {
  const { planId, exerciseId, setId } = useLocalSearchParams<{
    planId: string;
    exerciseId: string;
    setId: string;
  }>();
  const workoutSet = usePlansStore((state) =>
    state.plans
      .find((plan) => plan.id === planId)
      ?.exercises.find((exercise) => exercise.id === exerciseId)
      ?.sets.find((item) => item.id === setId)
  );
  const updateSet = usePlansStore((state) => state.updateSet);

  if (!workoutSet) {
    return (
      <AppScreen>
        <Stack.Screen options={{ title: 'Edit set' }} />
        <ScreenMessage error title="Workout set not found" />
      </AppScreen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit set' }} />
      <WorkoutSetForm
        initialValue={{
          type: workoutSet.type,
          targetWeightKg: workoutSet.targetWeightKg,
          targetReps: workoutSet.targetReps,
          restSeconds: workoutSet.restSeconds,
          notes: workoutSet.notes,
        }}
        onSubmit={async (input) => {
          await updateSet(planId, exerciseId, setId, input);
          router.back();
        }}
        submitLabel="Save changes"
      />
    </>
  );
}
