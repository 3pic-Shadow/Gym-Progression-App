import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { PreviousExercisePanel } from '@/src/components/PreviousExercisePanel';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ScreenMessage } from '@/src/components/ui/ScreenMessage';
import { getRecordedWorkoutExerciseOptions } from '@/src/data/recordWorkoutPresets';
import { useElapsedSeconds } from '@/src/hooks/useElapsedSeconds';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';
import { formatCountdown } from '@/src/services/timer';
import { usePlansStore, useSessionStore, useSettingsStore } from '@/src/store';
import { confirmAction } from '@/src/utils/confirm';
import {
  formatVolume,
  getExerciseSessionHistory,
  getSessionExerciseVolumes,
} from '@/src/utils/progressionAnalytics';
import { routes } from '@/src/utils/routes';

function numberFromInput(value: string) {
  return value.trim() === '' ? Number.NaN : Number(value);
}

export default function RecordWorkoutScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const palette = Colors[useResolvedColorScheme()];
  const session = useSessionStore((state) => state.activeSession);
  const history = useSessionStore((state) => state.history);
  const plans = usePlansStore((state) => state.plans);
  const configuredDays = useSettingsStore((state) => state.settings.recordWorkoutDays);
  const recordManualSet = useSessionStore((state) => state.recordManualSet);
  const finishRest = useSessionStore((state) => state.finishRest);
  const finishRecordedWorkout = useSessionStore((state) => state.finishRecordedWorkout);
  const cancelWorkout = useSessionStore((state) => state.cancelWorkout);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [customExercise, setCustomExercise] = useState('');
  const [usingCustomExercise, setUsingCustomExercise] = useState(false);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [historyVisible, setHistoryVisible] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const elapsedRestSeconds = useElapsedSeconds(
    session?.mode === 'recording' && session.status === 'resting'
      ? session.restStartedAt
      : undefined
  );
  const exerciseOptions = useMemo(() => {
    if (!session || session.mode !== 'recording') return [];
    const suggested = getRecordedWorkoutExerciseOptions(
      session.planSnapshot.name,
      configuredDays,
      plans
    );
    const recorded = session.planSnapshot.exercises.map((exercise) => exercise.name);
    return Array.from(new Map([...suggested, ...recorded].map((name) => [name.toLowerCase(), name])).values());
  }, [configuredDays, plans, session]);
  const exerciseName = usingCustomExercise ? customExercise.trim() : selectedExercise;
  const previousExerciseSession = exerciseName
    ? getExerciseSessionHistory(history, exerciseName)[0]
    : undefined;
  const exerciseVolumes = session ? getSessionExerciseVolumes(session) : [];

  useEffect(() => {
    if (exerciseOptions.length === 0) {
      setUsingCustomExercise(true);
      return;
    }
    if (!selectedExercise || !exerciseOptions.includes(selectedExercise)) {
      setSelectedExercise(exerciseOptions[0]);
    }
  }, [exerciseOptions, selectedExercise]);

  useEffect(() => {
    if (!session || !exerciseName) return;
    const currentExercise = session.planSnapshot.exercises.find(
      (exercise) => exercise.name.trim().toLowerCase() === exerciseName.toLowerCase()
    );
    const latestCurrentSet = currentExercise?.sets[currentExercise.sets.length - 1];
    const historicalSession = getExerciseSessionHistory(history, exerciseName)[0];
    const latestHistorySet = historicalSession?.sets[historicalSession.sets.length - 1];
    setWeight(String(latestCurrentSet?.targetWeightKg ?? latestHistorySet?.weightKg ?? ''));
    setReps(String(latestCurrentSet?.targetReps ?? latestHistorySet?.reps ?? ''));
  }, [exerciseName, history, session]);

  if (!session || session.id !== sessionId || session.mode !== 'recording') {
    return (
      <AppScreen includeTopInset>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenMessage
          body="The recorded workout may have been completed or discarded."
          error
          title="Recorded workout not found"
        />
        <AppButton label="Return home" onPress={() => router.replace(routes.home)} />
      </AppScreen>
    );
  }

  const recordSet = async () => {
    setWorking(true);
    setError(null);
    try {
      await recordManualSet(exerciseName, numberFromInput(weight), numberFromInput(reps));
    } catch (recordError) {
      setError(recordError instanceof Error ? recordError.message : 'Unable to record set');
    } finally {
      setWorking(false);
    }
  };

  const continueAfterRest = async () => {
    setWorking(true);
    setError(null);
    try {
      await finishRest();
    } catch (restError) {
      setError(restError instanceof Error ? restError.message : 'Unable to finish rest');
    } finally {
      setWorking(false);
    }
  };

  const finishWorkout = async () => {
    setWorking(true);
    setError(null);
    try {
      const completedSessionId = await finishRecordedWorkout();
      router.replace(routes.historySession(completedSessionId, true));
    } catch (finishError) {
      setError(finishError instanceof Error ? finishError.message : 'Unable to finish workout');
      setWorking(false);
    }
  };

  const discardWorkout = async () => {
    setWorking(true);
    setError(null);
    try {
      await cancelWorkout();
      router.replace(routes.home);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Unable to discard workout');
      setWorking(false);
    }
  };

  const confirmDiscard = () =>
    confirmAction(
      'Discard recorded workout?',
      'None of the sets from this workout will be saved to history.',
      () => void discardWorkout(),
      'Discard workout'
    );

  if (session.status === 'resting') {
    const lastResult = session.results[session.results.length - 1];
    const lastExercise = session.planSnapshot.exercises.find(
      (exercise) => exercise.id === lastResult?.exerciseId
    );

    return (
      <AppScreen
        contentContainerStyle={styles.restScreen}
        footer={
          <AppButton
            disabled={working}
            icon="check"
            label="Rest done — record next set"
            loading={working}
            onPress={() => void continueAfterRest()}
          />
        }
        includeTopInset>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={[styles.restLabel, { color: palette.tint }]}>REST TIME</Text>
        <Text
          accessibilityLabel={`${elapsedRestSeconds} seconds of rest elapsed`}
          accessibilityLiveRegion="polite"
          style={[styles.timer, { color: palette.text }]}>
          {formatCountdown(elapsedRestSeconds)}
        </Text>
        <Text style={[styles.restHint, { color: palette.textMuted }]}>Counting up — take the time you need.</Text>
        {lastExercise && lastResult ? (
          <View style={[styles.lastSet, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <MaterialIcons color={palette.success} name="check-circle" size={24} />
            <View style={styles.lastSetCopy}>
              <Text style={[styles.lastSetName, { color: palette.text }]}>{lastExercise.name}</Text>
              <Text style={[styles.restHint, { color: palette.textMuted }]}>
                {lastResult.actualWeightKg} kg x {lastResult.actualReps}
              </Text>
            </View>
          </View>
        ) : null}
        {error ? <ScreenMessage body={error} error title="Rest action failed" /> : null}
        <AppButton
          disabled={working}
          icon="flag"
          label="Finish workout"
          onPress={() => void finishWorkout()}
          variant="secondary"
        />
        <AppButton disabled={working} label="Discard workout" onPress={confirmDiscard} variant="danger" />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      footer={
        <AppButton
          disabled={working || !exerciseName}
          icon="add-task"
          label="Record set"
          loading={working}
          onPress={() => void recordSet()}
        />
      }
      includeTopInset>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <View style={styles.topCopy}>
          <Text style={[styles.eyebrow, { color: palette.tint }]}>RECORD WORKOUT</Text>
          <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>
            {session.planSnapshot.name}
          </Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>
            {session.results.length} {session.results.length === 1 ? 'set' : 'sets'} recorded
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: palette.text }]}>What did you do?</Text>
      {exerciseOptions.length > 0 ? (
        <View style={styles.chips}>
          {exerciseOptions.map((option) => {
            const selected = !usingCustomExercise && selectedExercise === option;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={option}
                onPress={() => {
                  setUsingCustomExercise(false);
                  setSelectedExercise(option);
                }}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: selected ? palette.tint : palette.surface,
                    borderColor: selected ? palette.tint : palette.border,
                  },
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.chipLabel, { color: selected ? palette.tintContrast : palette.text }]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: usingCustomExercise }}
            onPress={() => setUsingCustomExercise(true)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: usingCustomExercise ? palette.tint : palette.surface,
                borderColor: usingCustomExercise ? palette.tint : palette.border,
              },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.chipLabel, { color: usingCustomExercise ? palette.tintContrast : palette.text }]}>
              Other exercise
            </Text>
          </Pressable>
        </View>
      ) : null}

      {usingCustomExercise ? (
        <View style={styles.field}>
          <Text style={[styles.inputLabel, { color: palette.text }]}>Exercise name</Text>
          <TextInput
            accessibilityLabel="Exercise name"
            autoFocus
            maxLength={80}
            onChangeText={setCustomExercise}
            placeholder="Example: Bulgarian split squats"
            placeholderTextColor={palette.textMuted}
            style={[
              styles.textInput,
              { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
            ]}
            value={customExercise}
          />
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <View style={styles.inputColumn}>
          <Text style={[styles.inputLabel, { color: palette.text }]}>Weight (kg)</Text>
          <TextInput
            accessibilityLabel="Weight in kilograms"
            keyboardType="decimal-pad"
            onChangeText={setWeight}
            selectTextOnFocus
            style={[
              styles.numberInput,
              { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
            ]}
            value={weight}
          />
        </View>
        <View style={styles.inputColumn}>
          <Text style={[styles.inputLabel, { color: palette.text }]}>Reps</Text>
          <TextInput
            accessibilityLabel="Repetitions"
            keyboardType="number-pad"
            onChangeText={setReps}
            selectTextOnFocus
            style={[
              styles.numberInput,
              { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
            ]}
            value={reps}
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
      {error ? <ScreenMessage body={error} error title="Set not recorded" /> : null}

      {exerciseVolumes.length > 0 ? (
        <View style={[styles.summary, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.summaryTitle, { color: palette.text }]}>This workout</Text>
          {exerciseVolumes.map((exercise) => (
            <View key={exercise.normalizedName} style={styles.summaryRow}>
              <Text style={[styles.summaryName, { color: palette.text }]}>{exercise.name}</Text>
              <Text style={[styles.summaryValue, { color: palette.textMuted }]}>
                {exercise.completedSets} {exercise.completedSets === 1 ? 'set' : 'sets'} ·{' '}
                {formatVolume(exercise.volumeKg)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <AppButton
        disabled={working || session.results.length === 0}
        icon="flag"
        label="Finish workout"
        onPress={() => void finishWorkout()}
        variant="secondary"
      />
      <AppButton disabled={working} label="Discard workout" onPress={confirmDiscard} variant="danger" />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topBar: { alignItems: 'center', minHeight: 88 },
  topCopy: { alignItems: 'center', gap: Spacing.xs },
  eyebrow: { fontSize: 12, fontWeight: '800' },
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: TouchTarget.minimum,
    paddingHorizontal: Spacing.md,
  },
  chipLabel: { fontSize: 14, fontWeight: '700' },
  field: { gap: Spacing.xs },
  inputRow: { flexDirection: 'row', gap: Spacing.md },
  inputColumn: { flex: 1, gap: Spacing.xs },
  inputLabel: { fontSize: 14, fontWeight: '700' },
  textInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 17,
    minHeight: TouchTarget.primary,
    paddingHorizontal: Spacing.md,
  },
  numberInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 24,
    fontWeight: '700',
    minHeight: 58,
    paddingHorizontal: Spacing.md,
    textAlign: 'center',
  },
  summary: { borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.md },
  summaryTitle: { fontSize: 16, fontWeight: '800', marginBottom: Spacing.sm },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'space-between', minHeight: 28 },
  summaryName: { flex: 1, fontSize: 14, fontWeight: '700' },
  summaryValue: { fontSize: 13, textAlign: 'right' },
  restScreen: { alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  restLabel: { fontSize: 18, fontWeight: '800' },
  timer: { fontSize: 72, fontVariant: ['tabular-nums'], fontWeight: '800' },
  restHint: { fontSize: 15, textAlign: 'center' },
  lastSet: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  lastSetCopy: { flex: 1, gap: Spacing.xs },
  lastSetName: { fontSize: 17, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});
