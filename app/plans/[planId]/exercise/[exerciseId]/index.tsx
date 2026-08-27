import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { IconAction } from '@/src/components/ui/IconAction';
import { ScreenMessage } from '@/src/components/ui/ScreenMessage';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';
import { usePlansStore } from '@/src/store';
import { confirmAction } from '@/src/utils/confirm';
import { routes } from '@/src/utils/routes';

export default function ExerciseDetailScreen() {
  const { planId, exerciseId } = useLocalSearchParams<{
    planId: string;
    exerciseId: string;
  }>();
  const palette = Colors[useResolvedColorScheme()];
  const exercise = usePlansStore((state) =>
    state.plans
      .find((plan) => plan.id === planId)
      ?.exercises.find((item) => item.id === exerciseId)
  );
  const duplicateSet = usePlansStore((state) => state.duplicateSet);
  const removeSet = usePlansStore((state) => state.removeSet);
  const moveSet = usePlansStore((state) => state.moveSet);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!exercise) {
    return (
      <AppScreen>
        <Stack.Screen options={{ title: 'Exercise' }} />
        <ScreenMessage error title="Exercise not found" />
      </AppScreen>
    );
  }

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update set');
    }
  };

  return (
    <AppScreen>
      <Stack.Screen options={{ title: exercise.name }} />
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: palette.text }]}>{exercise.name}</Text>
          {exercise.notes ? (
            <Text style={[styles.notes, { color: palette.textMuted }]}>{exercise.notes}</Text>
          ) : null}
          <Text style={[styles.meta, { color: palette.textMuted }]}>
            Default rest {exercise.defaultRestSeconds} seconds
          </Text>
        </View>
        <IconAction
          icon="edit"
          label="Edit exercise"
          onPress={() => router.push(routes.editExercise(planId, exerciseId))}
        />
      </View>
      <AppButton
        icon="add"
        label="Add set"
        onPress={() => router.push(routes.newSet(planId, exerciseId))}
      />
      {actionError ? <ScreenMessage body={actionError} error title="Action failed" /> : null}
      {exercise.sets.length === 0 ? (
        <ScreenMessage body="Add at least one set before starting this workout." title="No sets" />
      ) : null}
      {exercise.sets.map((workoutSet, index) => (
        <View
          key={workoutSet.id}
          style={[
            styles.setCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={[styles.setTitle, { color: palette.text }]}>Set {index + 1}</Text>
              <Text style={[styles.target, { color: palette.text }]}>
                {workoutSet.targetWeightKg} kg x {workoutSet.targetReps} reps
              </Text>
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                {workoutSet.type === 'warmup' ? 'Warm-up' : 'Working'} | {workoutSet.restSeconds}s
                rest
              </Text>
              {workoutSet.notes ? (
                <Text style={[styles.notes, { color: palette.textMuted }]}>{workoutSet.notes}</Text>
              ) : null}
            </View>
            <IconAction
              icon="edit"
              label={'Edit set ' + (index + 1)}
              onPress={() => router.push(routes.editSet(planId, exerciseId, workoutSet.id))}
            />
          </View>
          <View style={styles.actions}>
            <IconAction
              disabled={index === 0}
              icon="arrow-upward"
              label={'Move set ' + (index + 1) + ' up'}
              onPress={() =>
                void runAction(() => moveSet(planId, exerciseId, workoutSet.id, 'up'))
              }
            />
            <IconAction
              disabled={index === exercise.sets.length - 1}
              icon="arrow-downward"
              label={'Move set ' + (index + 1) + ' down'}
              onPress={() =>
                void runAction(() => moveSet(planId, exerciseId, workoutSet.id, 'down'))
              }
            />
            <View style={styles.actionSpacer} />
            <IconAction
              icon="content-copy"
              label={'Duplicate set ' + (index + 1)}
              onPress={() =>
                void runAction(() => duplicateSet(planId, exerciseId, workoutSet.id))
              }
            />
            <IconAction
              danger
              icon="delete-outline"
              label={'Delete set ' + (index + 1)}
              onPress={() =>
                confirmAction(
                  'Delete set?',
                  'Delete set ' + (index + 1) + ' from ' + exercise.name + '?',
                  () => void runAction(() => removeSet(planId, exerciseId, workoutSet.id))
                )
              }
            />
          </View>
        </View>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.sm },
  headerCopy: { flex: 1, gap: Spacing.xs },
  title: { fontSize: 26, fontWeight: '800' },
  notes: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 14 },
  setCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
    padding: Spacing.md,
  },
  setTitle: { fontSize: 15, fontWeight: '700' },
  target: { fontSize: 20, fontWeight: '800' },
  actions: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  actionSpacer: { flex: 1 },
});
