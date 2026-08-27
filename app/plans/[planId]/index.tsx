import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, ThemeTokens, TouchTarget } from '@/constants/theme';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { IconAction } from '@/src/components/ui/IconAction';
import { ScreenMessage } from '@/src/components/ui/ScreenMessage';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';
import { usePlansStore } from '@/src/store';
import { confirmAction } from '@/src/utils/confirm';
import { getPlanMetrics } from '@/src/utils/planMetrics';
import { routes } from '@/src/utils/routes';

export default function PlanDetailScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const colorScheme = useResolvedColorScheme();
  const palette = Colors[colorScheme];
  const tokens = ThemeTokens[colorScheme];
  const plan = usePlansStore((state) => state.plans.find((item) => item.id === planId));
  const duplicateExercise = usePlansStore((state) => state.duplicateExercise);
  const duplicatePlan = usePlansStore((state) => state.duplicatePlan);
  const removePlan = usePlansStore((state) => state.removePlan);
  const removeExercise = usePlansStore((state) => state.removeExercise);
  const moveExercise = usePlansStore((state) => state.moveExercise);
  const [actionError, setActionError] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  if (!plan) {
    return (
      <AppScreen>
        <Stack.Screen options={{ title: 'Plan' }} />
        <ScreenMessage error title="Workout plan not found" />
      </AppScreen>
    );
  }

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update exercise');
    }
  };
  const metrics = getPlanMetrics(plan);

  return (
    <AppScreen>
      <Stack.Screen options={{ title: plan.name }} />
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: palette.text }]}>{plan.name}</Text>
          {plan.description ? (
            <Text style={[styles.description, { color: palette.textMuted }]}>
              {plan.description}
            </Text>
          ) : null}
          <Text style={[styles.metrics, { color: palette.textMuted }]}>
            {metrics.exerciseCount} {metrics.exerciseCount === 1 ? 'exercise' : 'exercises'} |{' '}
            {metrics.setCount} {metrics.setCount === 1 ? 'set' : 'sets'}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Plan actions"
          accessibilityRole="button"
          onPress={() => setMenuVisible(true)}
          style={[styles.menuButton, { backgroundColor: palette.surfaceMuted, borderColor: palette.border, borderRadius: tokens.buttonRadius, borderWidth: tokens.buttonBorderWidth }]}>
          <MaterialIcons color={palette.icon} name="more-vert" size={26} />
        </Pressable>
      </View>
      <AppButton
        icon="add"
        label="Add exercise"
        onPress={() => router.push(routes.newExercise(plan.id))}
      />
      {actionError ? <ScreenMessage body={actionError} error title="Action failed" /> : null}
      {plan.exercises.length === 0 ? (
        <ScreenMessage body="Add an exercise to continue building this plan." title="No exercises" />
      ) : null}
      {plan.exercises.map((exercise, index) => (
        <View
          key={exercise.id}
          style={[
            styles.exerciseCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={[styles.exerciseName, { color: palette.text }]}>
                {index + 1}. {exercise.name}
              </Text>
              <Text style={[styles.metrics, { color: palette.textMuted }]}>
                {exercise.sets.length} sets | default rest {exercise.defaultRestSeconds}s
              </Text>
            </View>
            <IconAction
              icon="chevron-right"
              label={'Open ' + exercise.name}
              onPress={() => router.push(routes.exercise(plan.id, exercise.id))}
            />
          </View>
          <View style={styles.actions}>
            <IconAction
              disabled={index === 0}
              icon="arrow-upward"
              label={'Move ' + exercise.name + ' up'}
              onPress={() => void runAction(() => moveExercise(plan.id, exercise.id, 'up'))}
            />
            <IconAction
              disabled={index === plan.exercises.length - 1}
              icon="arrow-downward"
              label={'Move ' + exercise.name + ' down'}
              onPress={() => void runAction(() => moveExercise(plan.id, exercise.id, 'down'))}
            />
            <View style={styles.actionSpacer} />
            <IconAction
              icon="content-copy"
              label={'Duplicate ' + exercise.name}
              onPress={() => void runAction(() => duplicateExercise(plan.id, exercise.id))}
            />
            <IconAction
              danger
              icon="delete-outline"
              label={'Delete ' + exercise.name}
              onPress={() =>
                confirmAction(
                  'Delete exercise?',
                  'Delete "' + exercise.name + '" and all of its sets?',
                  () => void runAction(() => removeExercise(plan.id, exercise.id))
                )
              }
            />
          </View>
        </View>
      ))}
      <Modal animationType="fade" transparent visible={menuVisible} onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menu, { backgroundColor: palette.surface, borderColor: palette.border, borderRadius: tokens.radius, borderWidth: tokens.borderWidth }, tokens.surfaceShadow]}>
            <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push(routes.editPlan(plan.id)); }}>
              <MaterialIcons color={palette.icon} name="edit" size={22} />
              <Text style={[styles.menuText, { color: palette.text }]}>Edit plan</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); void runAction(async () => { await duplicatePlan(plan.id); router.replace(routes.plans); }); }}>
              <MaterialIcons color={palette.icon} name="content-copy" size={22} />
              <Text style={[styles.menuText, { color: palette.text }]}>Copy plan</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); confirmAction('Delete plan?', 'Delete "' + plan.name + '" and all of its exercises and sets?', () => void runAction(async () => { await removePlan(plan.id); router.replace(routes.plans); })); }}>
              <MaterialIcons color={palette.danger} name="delete-outline" size={22} />
              <Text style={[styles.menuText, { color: palette.danger }]}>Delete plan</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.sm },
  headerCopy: { flex: 1, gap: Spacing.xs },
  title: { fontSize: 26, fontWeight: '800' },
  description: { fontSize: 15, lineHeight: 22 },
  metrics: { fontSize: 14 },
  exerciseCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
    padding: Spacing.md,
  },
  exerciseName: { fontSize: 18, fontWeight: '700' },
  actions: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  actionSpacer: { flex: 1 },
  menuButton: { alignItems: 'center', height: TouchTarget.minimum, justifyContent: 'center', width: TouchTarget.minimum },
  menuBackdrop: { alignItems: 'flex-end', backgroundColor: 'rgba(0,0,0,0.25)', flex: 1, padding: Spacing.md, paddingTop: 72 },
  menu: { minWidth: 190, paddingVertical: Spacing.xs },
  menuItem: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm, minHeight: TouchTarget.minimum, paddingHorizontal: Spacing.sm },
  menuText: { fontSize: 15, fontWeight: '700' },
});
