import { Stack, router, useLocalSearchParams } from 'expo-router';

import { ExerciseForm } from '@/src/components/forms/ExerciseForm';
import { usePlansStore } from '@/src/store';
import { routes } from '@/src/utils/routes';

export default function NewExerciseScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const createExercise = usePlansStore((state) => state.createExercise);

  return (
    <>
      <Stack.Screen options={{ title: 'New exercise' }} />
      <ExerciseForm
        onSubmit={async (input) => {
          const exerciseId = await createExercise(planId, input);
          router.replace(routes.exercise(planId, exerciseId));
        }}
        submitLabel="Add exercise"
      />
    </>
  );
}
