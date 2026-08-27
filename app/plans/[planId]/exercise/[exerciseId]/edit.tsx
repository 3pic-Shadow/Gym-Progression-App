import { Stack, router, useLocalSearchParams } from 'expo-router';

import { ExerciseForm } from '@/src/components/forms/ExerciseForm';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ScreenMessage } from '@/src/components/ui/ScreenMessage';
import { usePlansStore } from '@/src/store';

export default function EditExerciseScreen() {
  const { planId, exerciseId } = useLocalSearchParams<{
    planId: string;
    exerciseId: string;
  }>();
  const exercise = usePlansStore((state) =>
    state.plans
      .find((plan) => plan.id === planId)
      ?.exercises.find((item) => item.id === exerciseId)
  );
  const updateExercise = usePlansStore((state) => state.updateExercise);

  if (!exercise) {
    return (
      <AppScreen>
        <Stack.Screen options={{ title: 'Edit exercise' }} />
        <ScreenMessage error title="Exercise not found" />
      </AppScreen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit exercise' }} />
      <ExerciseForm
        initialValue={{
          name: exercise.name,
          notes: exercise.notes,
          defaultRestSeconds: exercise.defaultRestSeconds,
        }}
        onSubmit={async (input) => {
          await updateExercise(planId, exerciseId, input);
          router.back();
        }}
        submitLabel="Save changes"
      />
    </>
  );
}
