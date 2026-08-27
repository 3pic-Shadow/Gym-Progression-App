import { Stack, router } from 'expo-router';

import { PlanForm } from '@/src/components/forms/PlanForm';
import { usePlansStore } from '@/src/store';
import { routes } from '@/src/utils/routes';

export default function NewPlanScreen() {
  const createPlan = usePlansStore((state) => state.createPlan);

  return (
    <>
      <Stack.Screen options={{ title: 'New plan' }} />
      <PlanForm
        onSubmit={async (input) => {
          const planId = await createPlan(input);
          router.replace(routes.plan(planId));
        }}
        submitLabel="Create plan"
      />
    </>
  );
}
