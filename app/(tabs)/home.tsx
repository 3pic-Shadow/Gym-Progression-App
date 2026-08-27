import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ScreenMessage } from '@/src/components/ui/ScreenMessage';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';
import { usePlansStore, useSessionStore } from '@/src/store';
import { getPlanMetrics } from '@/src/utils/planMetrics';
import { routes } from '@/src/utils/routes';
import { startableWorkoutPlanSchema } from '@/src/validation';

export default function HomeScreen() {
  const palette = Colors[useResolvedColorScheme()];
  const plans = usePlansStore((state) => state.plans);
  const activeSession = useSessionStore((state) => state.activeSession);
  const startWorkout = useSessionStore((state) => state.startWorkout);
  const [startingPlanId, setStartingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async (planId: string) => {
    const plan = plans.find((item) => item.id === planId);
    if (!plan) {
      return;
    }

    setError(null);
    setStartingPlanId(planId);
    try {
      const sessionId = await startWorkout(plan);
      router.push(routes.workout(sessionId));
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Unable to start workout');
    } finally {
      setStartingPlanId(null);
    }
  };

  return (
    <AppScreen>
      {activeSession ? (
        <View
          style={[
            styles.activeCard,
            { backgroundColor: palette.surface, borderColor: palette.tint },
          ]}>
          <Text style={[styles.eyebrow, { color: palette.tint }]}>
            {activeSession.status === 'paused' ? 'PAUSED WORKOUT' : 'WORKOUT IN PROGRESS'}
          </Text>
          <Text style={[styles.title, { color: palette.text }]}>
            {activeSession.planSnapshot.name}
          </Text>
          <AppButton
            label="Resume workout"
            onPress={() =>
              router.push(
                activeSession.mode === 'recording'
                  ? routes.recordWorkout(activeSession.id)
                  : routes.workout(activeSession.id)
              )
            }
          />
        </View>
      ) : null}
      {error ? <ScreenMessage body={error} error title="Could not start workout" /> : null}
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>
        Start a workout
      </Text>
      <View
        style={[
          styles.recordCard,
          { backgroundColor: palette.surface, borderColor: palette.tint },
        ]}>
        <View style={styles.recordCopy}>
          <Text style={[styles.title, { color: palette.text }]}>Record workout</Text>
          <Text style={[styles.meta, { color: palette.textMuted }]}>
            No fixed plan. Pick a day, log each set, and rest for as long as you need.
          </Text>
        </View>
        <AppButton
          disabled={Boolean(activeSession)}
          icon="edit-note"
          label={activeSession ? 'Workout already active' : 'Record workout'}
          onPress={() => router.push(routes.recordWorkoutSetup)}
        />
      </View>
      {plans.length === 0 ? (
        <ScreenMessage body="Create your first workout plan in Plans." title="No plans available" />
      ) : null}
      {plans.map((plan) => {
        const metrics = getPlanMetrics(plan);
        const validation = startableWorkoutPlanSchema.safeParse(plan);
        const blockedByActiveSession = Boolean(activeSession);

        return (
          <View
            key={plan.id}
            style={[
              styles.planCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}>
            <Text style={[styles.title, { color: palette.text }]}>{plan.name}</Text>
            <Text style={[styles.meta, { color: palette.textMuted }]}>
              {metrics.exerciseCount} {metrics.exerciseCount === 1 ? 'exercise' : 'exercises'} |{' '}
              {metrics.setCount} {metrics.setCount === 1 ? 'set' : 'sets'}
            </Text>
            {validation.success ? (
              <AppButton
                disabled={blockedByActiveSession}
                label={blockedByActiveSession ? 'Workout already active' : 'Start workout'}
                loading={startingPlanId === plan.id}
                onPress={() => void start(plan.id)}
              />
            ) : (
              <>
                <Text style={[styles.validation, { color: palette.warning }]}>
                  Add at least one set to every exercise before starting.
                </Text>
                <AppButton
                  label="Edit plan"
                  onPress={() => router.push(routes.plan(plan.id))}
                  variant="secondary"
                />
              </>
            )}
          </View>
        );
      })}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  activeCard: {
    borderRadius: Radius.md,
    borderWidth: 2,
    gap: Spacing.md,
    padding: Spacing.md,
  },
  planCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
    padding: Spacing.md,
  },
  recordCard: {
    borderRadius: Radius.md,
    borderWidth: 2,
    gap: Spacing.md,
    padding: Spacing.md,
  },
  recordCopy: { gap: Spacing.xs },
  eyebrow: { fontSize: 12, fontWeight: '800' },
  sectionTitle: { fontSize: 21, fontWeight: '800', marginTop: Spacing.sm },
  title: { fontSize: 20, fontWeight: '800' },
  meta: { fontSize: 14 },
  validation: { fontSize: 14, lineHeight: 20 },
});
