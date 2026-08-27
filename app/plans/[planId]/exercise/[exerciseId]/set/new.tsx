import { Stack, router, useLocalSearchParams } from 'expo-router';

import { WorkoutSetForm } from '@/src/components/forms/WorkoutSetForm';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ScreenMessage } from '@/src/components/ui/ScreenMessage';
import { usePlansStore } from '@/src/store';

export default function NewSetScreen() {
  const { planId, exerciseId } = useLocalSearchParams<{
    planId: string;
    exerciseId: string;
  }>();
  const exercise = usePlansStore((state) =>
    state.plans
      .find((plan) => plan.id === planId)
      ?.exercises.find((item) => item.id === exerciseId)
  );
  const createSet = usePlansStore((state) => state.createSet);

  if (!exercise) {
    return (
      <AppScreen>
        <Stack.Screen options={{ title: 'New set' }} />
        <ScreenMessage error title="Exercise not found" />
      </AppScreen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'New set' }} />
      <WorkoutSetForm
        initialValue={{
          type: 'working',
          targetWeightKg: 0,
          targetReps: 8,
          restSeconds: exercise.defaultRestSeconds,
        }}
        onSubmit={async (input) => {
          await createSet(planId, exerciseId, input);
          router.back();
        }}
        submitLabel="Add set"
      />
    </>
  );
}
