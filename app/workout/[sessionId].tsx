import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type DimensionValue,
} from 'react-native';

import { Colors, Radius, Spacing, TouchTarget } from '@/constants/theme';
import {
  AddTemporarySetModal,
  type TemporarySetSelection,
} from '@/src/components/AddTemporarySetModal';
import { PreviousExercisePanel } from '@/src/components/PreviousExercisePanel';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { IconAction } from '@/src/components/ui/IconAction';
import { ScreenMessage } from '@/src/components/ui/ScreenMessage';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';
import { useRestCountdown } from '@/src/hooks/useRestCountdown';
import {
  getCurrentExercise,
  getCurrentSet,
  getUpcomingSets,
  getWorkoutProgress,
} from '@/src/services/workoutProgression';
import { useSessionStore, useSettingsStore } from '@/src/store';
import { formatCountdown } from '@/src/services/timer';
import { confirmAction } from '@/src/utils/confirm';
import { getExerciseSessionHistory } from '@/src/utils/progressionAnalytics';
import { routes } from '@/src/utils/routes';

const ACTION_TRANSITION_LOCK_MILLISECONDS = 2000;

function numberFromInput(value: string) {
  return value.trim() === '' ? Number.NaN : Number(value);
}

export default function WorkoutScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const palette = Colors[useResolvedColorScheme()];
  const session = useSessionStore((state) => state.activeSession);
  const completeCurrentSet = useSessionStore((state) => state.completeCurrentSet);
  const skipCurrentSet = useSessionStore((state) => state.skipCurrentSet);
  const pauseWorkout = useSessionStore((state) => state.pauseWorkout);
  const resumeWorkout = useSessionStore((state) => state.resumeWorkout);
  const adjustRest = useSessionStore((state) => state.adjustRest);
  const finishRest = useSessionStore((state) => state.finishRest);
  const addTemporarySets = useSessionStore((state) => state.addTemporarySets);
  const undoLastSet = useSessionStore((state) => state.undoLastSet);
  const cancelWorkout = useSessionStore((state) => state.cancelWorkout);
  const history = useSessionStore((state) => state.history);
  const confirmBeforeEndingWorkout = useSettingsStore(
    (state) => state.settings.confirmBeforeEndingWorkout
  );
  const defaultRestSeconds = useSettingsStore((state) => state.settings.defaultRestSeconds);
  const currentExercise = session ? getCurrentExercise(session) : undefined;
  const currentSet = session ? getCurrentSet(session) : undefined;
  const progress = session ? getWorkoutProgress(session) : undefined;
  const [actualWeight, setActualWeight] = useState('');
  const [actualReps, setActualReps] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restActionPending, setRestActionPending] = useState(false);
  const [addSetVisible, setAddSetVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(true);
  const [unlockedActiveSetId, setUnlockedActiveSetId] = useState<string | null>(null);
  const [unlockedRestResultId, setUnlockedRestResultId] = useState<string | null>(null);
  const currentSetId = currentSet?.id;
  const activeSetId = session?.status === 'active' ? currentSetId : undefined;
  const completeSetUnlocked =
    activeSetId !== undefined && unlockedActiveSetId === activeSetId;
  const latestRestResult =
    session?.status === 'resting' ? session.results[session.results.length - 1] : undefined;
  const restSkipUnlocked =
    latestRestResult !== undefined && unlockedRestResultId === latestRestResult.id;
  const remainingRestSeconds = useRestCountdown(
    session?.status === 'resting' ? session.restEndsAt : undefined
  );
  const exerciseOptions = session
    ? Array.from(
        new Map(
          session.planSnapshot.exercises.map((exercise) => [
            exercise.name.trim().toLowerCase(),
            exercise,
          ])
        ).values()
      ).map((exercise) => {
        const latestSet = exercise.sets[exercise.sets.length - 1];
        return {
          id: exercise.id,
          name: exercise.name,
          targetWeightKg: latestSet?.targetWeightKg ?? 0,
          targetReps: latestSet?.targetReps ?? 8,
          restSeconds: latestSet?.restSeconds ?? exercise.defaultRestSeconds,
        };
      })
    : [];
  const previousExerciseSession = currentExercise
    ? getExerciseSessionHistory(history, currentExercise.name)[0]
    : undefined;

  useEffect(() => {
    if (currentSet) {
      setActualWeight(String(currentSet.targetWeightKg));
      setActualReps(String(currentSet.targetReps));
      setError(null);
    }
  }, [currentSetId, currentSet]);

  useEffect(() => {
    setUnlockedActiveSetId(null);

    if (!activeSetId) {
      return;
    }

    const timeout = setTimeout(
      () => setUnlockedActiveSetId(activeSetId),
      ACTION_TRANSITION_LOCK_MILLISECONDS
    );
    return () => clearTimeout(timeout);
  }, [activeSetId]);

  useEffect(() => {
    setUnlockedRestResultId(null);

    if (!latestRestResult) {
      return;
    }

    const remainingLockMilliseconds = Math.max(
      0,
      Date.parse(latestRestResult.completedAt) + ACTION_TRANSITION_LOCK_MILLISECONDS - Date.now()
    );
    const unlock = () => setUnlockedRestResultId(latestRestResult.id);

    if (remainingLockMilliseconds === 0) {
      unlock();
      return;
    }

    const timeout = setTimeout(unlock, remainingLockMilliseconds);
    return () => clearTimeout(timeout);
  }, [latestRestResult]);

  if (!session || session.id !== sessionId || !currentExercise || !currentSet || !progress) {
    return (
      <AppScreen includeTopInset>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenMessage
          body="The workout may have been completed or discarded."
          error
          title="Active workout not found"
        />
        <AppButton label="Return home" onPress={() => router.replace(routes.home)} />
      </AppScreen>
    );
  }

  const finishSet = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const completed = await completeCurrentSet(
        numberFromInput(actualWeight),
        numberFromInput(actualReps),
        false
      );
      if (completed) {
        router.replace(routes.historySession(session.id, true));
      }
    } catch (completionError) {
      setError(
        completionError instanceof Error ? completionError.message : 'Unable to complete set'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const skip = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const completed = await skipCurrentSet();
      if (completed) {
        router.replace(routes.historySession(session.id, true));
      }
    } catch (skipError) {
      setError(skipError instanceof Error ? skipError.message : 'Unable to skip set');
    } finally {
      setSubmitting(false);
    }
  };

  const endWorkout = async () => {
    setError(null);
    try {
      await cancelWorkout();
      router.replace(routes.home);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Unable to end workout');
    }
  };

  const cancel = () => {
    if (!confirmBeforeEndingWorkout) {
      void endWorkout();
      return;
    }

    confirmAction(
      'End workout?',
      'Completed and skipped sets from this session will not be saved to history.',
      () => void endWorkout(),
      'End workout'
    );
  };

  const skipRest = async () => {
    setRestActionPending(true);
    setError(null);
    try {
      await finishRest();
    } catch (restError) {
      setError(restError instanceof Error ? restError.message : 'Unable to skip rest');
    } finally {
      setRestActionPending(false);
    }
  };

  const adjustRestBy = async (seconds: number) => {
    setRestActionPending(true);
    setError(null);
    try {
      await adjustRest(seconds);
    } catch (restError) {
      setError(restError instanceof Error ? restError.message : 'Unable to adjust rest');
    } finally {
      setRestActionPending(false);
    }
  };

  const addSets = async (selection: TemporarySetSelection) => {
    await addTemporarySets({
      ...selection,
      defaultRestSeconds,
    });
  };

  const openAddSet = async () => {
    setRestActionPending(true);
    setError(null);
    try {
      await pauseWorkout();
      setAddSetVisible(true);
    } catch (pauseError) {
      setError(pauseError instanceof Error ? pauseError.message : 'Unable to pause rest');
    } finally {
      setRestActionPending(false);
    }
  };

  const closeAddSet = async () => {
    setAddSetVisible(false);
    try {
      await resumeWorkout();
    } catch (resumeError) {
      setError(resumeError instanceof Error ? resumeError.message : 'Unable to resume rest');
    }
  };

  const undoPreviousSet = async () => {
    setRestActionPending(true);
    setError(null);
    try {
      await undoLastSet();
    } catch (undoError) {
      setError(undoError instanceof Error ? undoError.message : 'Unable to undo set');
    } finally {
      setRestActionPending(false);
    }
  };

  const pauseCurrentWorkout = async () => {
    setRestActionPending(true);
    setError(null);
    try {
      await pauseWorkout();
    } catch (pauseError) {
      setError(pauseError instanceof Error ? pauseError.message : 'Unable to pause workout');
    } finally {
      setRestActionPending(false);
    }
  };

  const resumePausedWorkout = async () => {
    setError(null);
    try {
      await resumeWorkout();
    } catch (resumeError) {
      setError(resumeError instanceof Error ? resumeError.message : 'Unable to resume workout');
    }
  };

  if (session.status === 'paused') {
    if (addSetVisible && session.pausedFromStatus === 'resting') {
      return (
        <AppScreen contentContainerStyle={styles.pausedScreen} includeTopInset>
          <Stack.Screen options={{ headerShown: false }} />
          <Text style={[styles.pausedTitle, { color: palette.text }]}>Rest paused</Text>
          <AddTemporarySetModal
            defaultRestSeconds={defaultRestSeconds}
            exercises={exerciseOptions}
            onAdd={addSets}
            onDismiss={() => void closeAddSet()}
            visible
          />
        </AppScreen>
      );
    }

    return (
      <AppScreen
        contentContainerStyle={styles.pausedScreen}
        includeTopInset
        footer={
          <AppButton
            icon="play-arrow"
            label="Resume workout"
            onPress={() => void resumePausedWorkout()}
          />
        }>
        <Stack.Screen options={{ headerShown: false }} />
        <MaterialIcons color={palette.tint} name="pause-circle-outline" size={64} />
        <Text style={[styles.pausedTitle, { color: palette.text }]}>Workout paused</Text>
        <Text style={[styles.pausedBody, { color: palette.textMuted }]}>
          {session.pausedFromStatus === 'resting' && session.pausedRestMilliseconds !== undefined
            ? `${formatCountdown(Math.ceil(session.pausedRestMilliseconds / 1000))} rest remaining`
            : `${session.planSnapshot.name} is saved on this device.`}
        </Text>
        {error ? <ScreenMessage body={error} error title="Workout error" /> : null}
        <AppButton label="End workout" onPress={cancel} variant="danger" />
      </AppScreen>
    );
  }

  if (session.status === 'resting') {
    const lastResult = session.results[session.results.length - 1];
    const completedExercise = session.planSnapshot.exercises.find(
      (exercise) => exercise.id === lastResult?.exerciseId
    );
    const upcomingSets = getUpcomingSets(session, 3);

    return (
      <AppScreen
        contentContainerStyle={styles.restScreen}
        includeTopInset
        footer={
          <AppButton
            disabled={!restSkipUnlocked || restActionPending}
            label="Skip rest"
            loading={restActionPending}
            onPress={() => void skipRest()}
          />
        }>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={[styles.restLabel, { color: palette.tint }]}>REST</Text>
        <Text
          accessibilityLabel={remainingRestSeconds + ' seconds remaining'}
          accessibilityLiveRegion="polite"
          style={[styles.countdown, { color: palette.text }]}>
          {formatCountdown(remainingRestSeconds)}
        </Text>
        {completedExercise ? (
          <Text style={[styles.restMeta, { color: palette.textMuted }]}>
            {completedExercise.name} set complete
          </Text>
        ) : null}
        <View style={styles.restControls}>
          <View style={styles.restControl}>
            <IconAction
              disabled={restActionPending || remainingRestSeconds <= 16}
              icon="remove"
              label="Subtract 15 seconds from rest"
              onPress={() => void adjustRestBy(-15)}
            />
            <Text style={[styles.restControlLabel, { color: palette.textMuted }]}>-15 sec</Text>
          </View>
          <View style={styles.restControl}>
            <IconAction
              disabled={restActionPending}
              icon="pause"
              label="Pause rest"
              onPress={() => void pauseCurrentWorkout()}
            />
            <Text style={[styles.restControlLabel, { color: palette.textMuted }]}>Pause</Text>
          </View>
          <View style={styles.restControl}>
            <IconAction
              disabled={restActionPending}
              icon="add"
              label="Add 15 seconds to rest"
              onPress={() => void adjustRestBy(15)}
            />
            <Text style={[styles.restControlLabel, { color: palette.textMuted }]}>+15 sec</Text>
          </View>
        </View>
        <View style={[styles.nextPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.nextLabel, { color: palette.textMuted }]}>UP NEXT</Text>
          {upcomingSets.map(({ exercise, workoutSet, setIndex }, index) => (
            <View
              key={workoutSet.id}
              style={[
                styles.queueRow,
                index > 0 && { borderTopColor: palette.border, borderTopWidth: StyleSheet.hairlineWidth },
              ]}>
              <View style={styles.queuePosition}>
                <Text style={[styles.queueNumber, { color: index === 0 ? palette.tint : palette.textMuted }]}>
                  {index + 1}
                </Text>
              </View>
              <View style={styles.queueCopy}>
                <Text style={[styles.queueExercise, { color: palette.text }]}>{exercise.name}</Text>
                <Text style={[styles.nextMeta, { color: palette.textMuted }]}>Set {setIndex + 1}</Text>
              </View>
              <Text style={[styles.queueTarget, { color: palette.text }]}>
                {workoutSet.targetWeightKg} kg x {workoutSet.targetReps}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.restActionRow}>
          <AppButton
            disabled={restActionPending}
            icon="undo"
            label="Undo set"
            onPress={() => void undoPreviousSet()}
            style={styles.restActionButton}
            variant="secondary"
          />
          <AppButton
            disabled={restActionPending}
            icon="add"
            label="Add set"
            onPress={() => void openAddSet()}
            style={styles.restActionButton}
            variant="secondary"
          />
        </View>
        {error ? <ScreenMessage body={error} error title="Rest timer error" /> : null}
        <AppButton label="End workout" onPress={cancel} variant="danger" />
      </AppScreen>
    );
  }

  const overallPercent = progress.totalSets
    ? Math.round((progress.completedSets / progress.totalSets) * 100)
    : 0;
  const progressWidth = (overallPercent + '%') as DimensionValue;

  return (
    <AppScreen
      includeTopInset
      footer={
        <AppButton
          disabled={!completeSetUnlocked || submitting}
          label="Complete set"
          loading={submitting}
          onPress={() => void finishSet()}
        />
      }>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <View style={styles.topCopy}>
          <Text style={[styles.planName, { color: palette.textMuted }]}>
            {session.planSnapshot.name}
          </Text>
          <Text style={[styles.exerciseName, { color: palette.text }]}>
            {currentExercise.name}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Pause workout"
          accessibilityRole="button"
          onPress={() => void pauseCurrentWorkout()}
          style={[styles.iconButton, { backgroundColor: palette.surfaceMuted }]}>
          <MaterialIcons color={palette.icon} name="pause" size={26} />
        </Pressable>
      </View>
      <Text style={[styles.setProgress, { color: palette.tint }]}>
        Set {session.currentSetIndex + 1} of {currentExercise.sets.length}
      </Text>
      {currentExercise.notes ? (
        <Text style={[styles.notes, { color: palette.textMuted }]}>{currentExercise.notes}</Text>
      ) : null}
      <View
        style={[
          styles.targetPanel,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}>
        <View style={styles.targetColumn}>
          <Text style={[styles.targetValue, { color: palette.text }]}>
            {currentSet.targetWeightKg}
          </Text>
          <Text style={[styles.targetLabel, { color: palette.textMuted }]}>target kg</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        <View style={styles.targetColumn}>
          <Text style={[styles.targetValue, { color: palette.text }]}>
            {currentSet.targetReps}
          </Text>
          <Text style={[styles.targetLabel, { color: palette.textMuted }]}>target reps</Text>
        </View>
      </View>
      <View style={styles.inputRow}>
        <View style={styles.inputColumn}>
          <Text style={[styles.inputLabel, { color: palette.text }]}>Actual kg</Text>
          <TextInput
            accessibilityLabel="Actual weight in kilograms"
            keyboardType="decimal-pad"
            onChangeText={setActualWeight}
            selectTextOnFocus
            style={[
              styles.input,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={actualWeight}
          />
        </View>
        <View style={styles.inputColumn}>
          <Text style={[styles.inputLabel, { color: palette.text }]}>Actual reps</Text>
          <TextInput
            accessibilityLabel="Actual repetitions"
            keyboardType="number-pad"
            onChangeText={setActualReps}
            selectTextOnFocus
            style={[
              styles.input,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={actualReps}
          />
        </View>
      </View>
      {previousExerciseSession ? (
        <PreviousExercisePanel
          onToggle={() => setHistoryVisible((visible) => !visible)}
          session={previousExerciseSession}
          visible={historyVisible}
        />
      ) : null}
      {currentSet.notes ? (
        <ScreenMessage body={currentSet.notes} title="Set note" />
      ) : null}
      {error ? <ScreenMessage body={error} error title="Set not recorded" /> : null}
      <View style={styles.progressBlock}>
        <View style={styles.progressHeading}>
          <Text style={[styles.progressLabel, { color: palette.text }]}>Workout progress</Text>
          <Text style={[styles.progressLabel, { color: palette.textMuted }]}>
            {progress.completedSets} of {progress.totalSets}
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: palette.surfaceMuted }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: palette.tint, width: progressWidth },
            ]}
          />
        </View>
      </View>
      <AppButton
        disabled={submitting}
        label="Skip set"
        onPress={() => void skip()}
        variant="secondary"
      />
      <AppButton label="End workout" onPress={cancel} variant="danger" />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 88,
    position: 'relative',
  },
  topCopy: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: TouchTarget.minimum + Spacing.md,
    width: '100%',
  },
  planName: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  exerciseName: { fontSize: 36, fontWeight: '800', lineHeight: 42, textAlign: 'center' },
  iconButton: {
    alignItems: 'center',
    borderRadius: Radius.md,
    height: TouchTarget.minimum,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
    width: TouchTarget.minimum,
  },
  setProgress: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  notes: { fontSize: 15, lineHeight: 22 },
  targetPanel: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingVertical: Spacing.lg,
  },
  targetColumn: { alignItems: 'center', flex: 1, gap: Spacing.xs },
  targetValue: { fontSize: 42, fontWeight: '800' },
  targetLabel: { fontSize: 14, fontWeight: '700' },
  divider: { width: StyleSheet.hairlineWidth },
  inputRow: { flexDirection: 'row', gap: Spacing.md },
  inputColumn: { flex: 1, gap: Spacing.xs },
  inputLabel: { fontSize: 14, fontWeight: '700' },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 24,
    fontWeight: '700',
    minHeight: 58,
    paddingHorizontal: Spacing.md,
    textAlign: 'center',
  },
  progressBlock: { gap: Spacing.sm },
  progressHeading: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 14, fontWeight: '700' },
  progressTrack: { borderRadius: 4, height: 8, overflow: 'hidden' },
  progressFill: { borderRadius: 4, height: 8 },
  pausedScreen: { alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  pausedTitle: { fontSize: 28, fontWeight: '800' },
  pausedBody: { fontSize: 16, textAlign: 'center' },
  restScreen: { alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  restLabel: { fontSize: 18, fontWeight: '800' },
  countdown: { fontSize: 72, fontVariant: ['tabular-nums'], fontWeight: '800' },
  restMeta: { fontSize: 15, fontWeight: '700' },
  restControls: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  restActionRow: { alignSelf: 'stretch', flexDirection: 'row', gap: Spacing.sm },
  restActionButton: { flex: 1 },
  restControl: { alignItems: 'center', gap: Spacing.xs, minWidth: 64 },
  restControlLabel: { fontSize: 12, fontWeight: '700' },
  nextPanel: {
    alignSelf: 'stretch',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
    padding: Spacing.lg,
  },
  nextLabel: { fontSize: 12, fontWeight: '800' },
  nextExercise: { fontSize: 24, fontWeight: '800' },
  nextTarget: { fontSize: 18, fontWeight: '700' },
  nextMeta: { fontSize: 14 },
  queueRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm, minHeight: 52 },
  queuePosition: { alignItems: 'center', width: 24 },
  queueNumber: { fontSize: 15, fontWeight: '800' },
  queueCopy: { flex: 1 },
  queueExercise: { fontSize: 16, fontWeight: '800' },
  queueTarget: { fontSize: 15, fontWeight: '700' },
});
