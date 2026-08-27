import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { IconAction } from '@/src/components/ui/IconAction';
import { ScreenMessage } from '@/src/components/ui/ScreenMessage';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';
import { usePlansStore } from '@/src/store';
import { getPlanMetrics } from '@/src/utils/planMetrics';
import { routes } from '@/src/utils/routes';

export default function PlansScreen() {
  const palette = Colors[useResolvedColorScheme()];
  const plans = usePlansStore((state) => state.plans);
  const storageError = usePlansStore((state) => state.error);
  const movePlan = usePlansStore((state) => state.movePlan);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update plan');
    }
  };

  return (
    <AppScreen>
      <AppButton
        icon="add"
        label="New plan"
        onPress={() => router.push(routes.newPlan)}
      />
      {storageError ? <ScreenMessage body={storageError} error title="Plans unavailable" /> : null}
      {actionError ? <ScreenMessage body={actionError} error title="Action failed" /> : null}
      {plans.length === 0 && !storageError ? (
        <ScreenMessage
          body="Create a plan, then add exercises and sets."
          title="No workout plans"
        />
      ) : null}
      {plans.map((plan, index) => {
        const metrics = getPlanMetrics(plan);
        return (
          <Pressable
            key={plan.id}
            style={[
              styles.card,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel={'Open ' + plan.name}
            onPress={() => router.push(routes.plan(plan.id))}>
            <View style={styles.headingRow}>
              <View style={styles.cardCopy}>
                <Text style={[styles.name, { color: palette.text }]}>{plan.name}</Text>
                {plan.description ? (
                  <Text numberOfLines={2} style={[styles.description, { color: palette.textMuted }]}>
                    {plan.description}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text style={[styles.metrics, { color: palette.textMuted }]}>
              {metrics.exerciseCount} {metrics.exerciseCount === 1 ? 'exercise' : 'exercises'} |{' '}
              {metrics.setCount} {metrics.setCount === 1 ? 'set' : 'sets'}
            </Text>
            <View style={styles.actions}>
              <IconAction
                disabled={index === 0}
                icon="arrow-upward"
                label={'Move ' + plan.name + ' up'}
                onPress={() => void runAction(() => movePlan(plan.id, 'up'))}
              />
              <IconAction
                disabled={index === plans.length - 1}
                icon="arrow-downward"
                label={'Move ' + plan.name + ' down'}
                onPress={() => void runAction(() => movePlan(plan.id, 'down'))}
              />
            </View>
          </Pressable>
        );
      })}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
    padding: Spacing.md,
  },
  headingRow: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.sm },
  cardCopy: { flex: 1, gap: Spacing.xs },
  name: { fontSize: 20, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 20 },
  metrics: { fontSize: 14 },
  actions: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
});
