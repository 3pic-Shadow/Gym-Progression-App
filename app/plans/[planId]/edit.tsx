import { Stack, router, useLocalSearchParams } from 'expo-router';

import { PlanForm } from '@/src/components/forms/PlanForm';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ScreenMessage } from '@/src/components/ui/ScreenMessage';
import { usePlansStore } from '@/src/store';

export default function EditPlanScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const plan = usePlansStore((state) => state.plans.find((item) => item.id === planId));
  const updatePlan = usePlansStore((state) => state.updatePlan);

  if (!plan) {
    return (
      <AppScreen>
        <Stack.Screen options={{ title: 'Edit plan' }} />
        <ScreenMessage error title="Workout plan not found" />
      </AppScreen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit plan' }} />
      <PlanForm
        initialValue={{ name: plan.name, description: plan.description }}
        onSubmit={async (input) => {
          await updatePlan(plan.id, input);
          router.back();
        }}
        submitLabel="Save changes"
      />
    </>
  );
}
