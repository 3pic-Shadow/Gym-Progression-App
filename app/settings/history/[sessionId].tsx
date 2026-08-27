import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ScreenMessage } from '@/src/components/ui/ScreenMessage';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';
import { useSessionStore } from '@/src/store';
import { confirmAction } from '@/src/utils/confirm';
import { routes } from '@/src/utils/routes';
import { formatSessionDuration, getSessionSummary } from '@/src/utils/sessionSummary';
import { formatVolume } from '@/src/utils/progressionAnalytics';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function HistoryDetailScreen() {
  const { sessionId, summary: summaryParam } = useLocalSearchParams<{
    sessionId: string;
    summary?: string;
  }>();
  const palette = Colors[useResolvedColorScheme()];
  const session = useSessionStore((state) =>
    state.history.find((item) => item.id === sessionId)
  );
  const activeSession = useSessionStore((state) => state.activeSession);
  const startWorkout = useSessionStore((state) => state.startWorkout);
  const startRecordedWorkout = useSessionStore((state) => state.startRecordedWorkout);
  const removeHistoryEntry = useSessionStore((state) => state.removeHistoryEntry);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCompletionSummary = summaryParam === 'true';

  if (!session) {
    return (
      <AppScreen>
        <Stack.Screen options={{ title: 'Workout details' }} />
        <ScreenMessage
          body="This workout is no longer available in history."
          error
          title="Workout not found"
        />
        <AppButton label="Return to history" onPress={() => router.replace(routes.history)} />
      </AppScreen>
    );
  }

  const summary = getSessionSummary(session);
  const repeatWorkout = async () => {
    setWorking(true);
    setError(null);
    try {
      if (session.mode === 'recording') {
        const newSessionId = await startRecordedWorkout(session.planSnapshot.name);
        router.replace(routes.recordWorkout(newSessionId));
      } else {
        const newSessionId = await startWorkout(session.planSnapshot);
        router.replace(routes.workout(newSessionId));
      }
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Unable to repeat workout');
    } finally {
      setWorking(false);
    }
  };

  const remove = async () => {
    setWorking(true);
    setError(null);
    try {
      await removeHistoryEntry(session.id);
      router.replace(routes.history);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to delete workout');
      setWorking(false);
    }
  };

  return (
    <AppScreen
      footer={
        isCompletionSummary ? (
          <AppButton label="Done" onPress={() => router.replace(routes.home)} />
        ) : (
          <AppButton
            disabled={Boolean(activeSession)}
            icon="replay"
            label={
              activeSession
                ? 'Workout already active'
                : session.mode === 'recording'
                  ? 'Record this day again'
                  : 'Repeat workout'
            }
            loading={working}
            onPress={() => void repeatWorkout()}
          />
        )
      }>
      <Stack.Screen
        options={{
          headerBackVisible: !isCompletionSummary,
          title: isCompletionSummary ? 'Workout complete' : 'Workout details',
        }}
      />
      {isCompletionSummary ? (
        <View style={styles.completionHeader}>
          <MaterialIcons color={palette.success} name="check-circle" size={56} />
          <Text accessibilityRole="header" style={[styles.completionTitle, { color: palette.text }]}>
            Workout complete
          </Text>
        </View>
      ) : null}
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[styles.planName, { color: palette.text }]}>
          {session.planSnapshot.name}
        </Text>
        <Text style={[styles.date, { color: palette.textMuted }]}>
          {formatDate(session.completedAt ?? session.startedAt)}
        </Text>
      </View>
      <View
        style={[
          styles.metrics,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: palette.text }]}>
            {summary.completedSets}
          </Text>
          <Text style={[styles.metricLabel, { color: palette.textMuted }]}>completed</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: palette.border }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: palette.text }]}>{summary.skippedSets}</Text>
          <Text style={[styles.metricLabel, { color: palette.textMuted }]}>skipped</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: palette.border }]} />
        <View style={styles.metric}>
          <Text style={[styles.durationValue, { color: palette.text }]}>
            {formatSessionDuration(summary.durationMilliseconds)}
          </Text>
          <Text style={[styles.metricLabel, { color: palette.textMuted }]}>duration</Text>
        </View>
      </View>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>
        Volume by exercise
      </Text>
      <View style={[styles.volumeList, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        {summary.exerciseVolumes.map((exercise, index) => (
          <View
            key={exercise.normalizedName}
            style={[
              styles.volumeRow,
              index > 0 && { borderTopColor: palette.border, borderTopWidth: StyleSheet.hairlineWidth },
            ]}>
            <View style={styles.volumeCopy}>
              <Text style={[styles.volumeName, { color: palette.text }]}>{exercise.name}</Text>
              <Text style={[styles.volumeMeta, { color: palette.textMuted }]}>
                {exercise.completedSets} {exercise.completedSets === 1 ? 'set' : 'sets'} ·{' '}
                {exercise.totalReps} reps
              </Text>
            </View>
            <Text style={[styles.volumeValue, { color: palette.text }]}>
              {formatVolume(exercise.volumeKg)}
            </Text>
          </View>
        ))}
      </View>
      {summary.personalRecords > 0 ? (
        <View style={[styles.prNotice, { backgroundColor: palette.surfaceMuted }]}>
          <MaterialIcons color={palette.warning} name="emoji-events" size={22} />
          <Text style={[styles.prText, { color: palette.text }]}>
            {summary.personalRecords} saved {summary.personalRecords === 1 ? 'PR' : 'PRs'}
          </Text>
        </View>
      ) : null}
      {error ? <ScreenMessage body={error} error title="Workout action failed" /> : null}
      {session.planSnapshot.exercises.map((exercise) => {
        const exerciseVolume = summary.exerciseVolumes.find(
          (item) => item.normalizedName === exercise.name.trim().toLowerCase()
        );
        return (
          <View
            key={exercise.id}
            style={[
              styles.exercise,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}>
          <View style={styles.exerciseHeader}>
            <Text style={[styles.exerciseName, { color: palette.text }]}>{exercise.name}</Text>
            <Text style={[styles.exerciseVolume, { color: palette.textMuted }]}>
              {formatVolume(exerciseVolume?.volumeKg ?? 0)}
            </Text>
          </View>
          {exercise.sets.map((workoutSet, index) => {
            const result = session.results.find((item) => item.setId === workoutSet.id);
            const completed = result?.status === 'completed';
            return (
              <View
                key={workoutSet.id}
                style={[
                  styles.setRow,
                  index > 0 && {
                    borderTopColor: palette.border,
                    borderTopWidth: StyleSheet.hairlineWidth,
                  },
                ]}>
                <View style={styles.setHeading}>
                  <View style={styles.setNameRow}>
                    <MaterialIcons
                      color={completed ? palette.success : palette.textMuted}
                      name={completed ? 'check-circle' : 'remove-circle-outline'}
                      size={20}
                    />
                    <Text style={[styles.setName, { color: palette.text }]}>Set {index + 1}</Text>
                    {workoutSet.type === 'warmup' ? (
                      <Text style={[styles.setType, { color: palette.textMuted }]}>Warm-up</Text>
                    ) : null}
                    {result?.isPersonalRecord ? (
                      <MaterialIcons color={palette.warning} name="emoji-events" size={19} />
                    ) : null}
                  </View>
                  <Text style={[styles.status, { color: completed ? palette.success : palette.textMuted }]}>
                    {completed ? 'Completed' : 'Skipped'}
                  </Text>
                </View>
                <View style={styles.valuesRow}>
                  <View style={styles.valueGroup}>
                    <Text style={[styles.valueLabel, { color: palette.textMuted }]}>Target</Text>
                    <Text style={[styles.value, { color: palette.text }]}>
                      {workoutSet.targetWeightKg} kg x {workoutSet.targetReps}
                    </Text>
                  </View>
                  <View style={styles.valueGroup}>
                    <Text style={[styles.valueLabel, { color: palette.textMuted }]}>Actual</Text>
                    <Text style={[styles.value, { color: palette.text }]}>
                      {completed
                        ? `${result?.actualWeightKg ?? 0} kg x ${result?.actualReps ?? 0}`
                        : 'Not recorded'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
          </View>
        );
      })}
      {!isCompletionSummary ? (
        <AppButton
          disabled={working}
          label="Delete from history"
          onPress={() =>
            confirmAction(
              'Delete workout?',
              `Delete this ${session.planSnapshot.name} workout from history?`,
              () => void remove()
            )
          }
          variant="danger"
        />
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  completionHeader: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  completionTitle: { fontSize: 26, fontWeight: '800' },
  heading: { gap: Spacing.xs },
  planName: { fontSize: 28, fontWeight: '800' },
  date: { fontSize: 14 },
  metrics: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingVertical: Spacing.md,
  },
  metric: { alignItems: 'center', flex: 1, gap: Spacing.xs, justifyContent: 'center' },
  metricDivider: { width: StyleSheet.hairlineWidth },
  metricValue: { fontSize: 24, fontWeight: '800' },
  durationValue: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  metricLabel: { fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 20, fontWeight: '800', marginTop: Spacing.sm },
  volumeList: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  volumeRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
  volumeCopy: { flex: 1, gap: Spacing.xs },
  volumeName: { fontSize: 16, fontWeight: '800' },
  volumeMeta: { fontSize: 13 },
  volumeValue: { fontSize: 16, fontWeight: '800' },
  prNotice: { alignItems: 'center', borderRadius: Radius.md, flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
  prText: { fontSize: 14, fontWeight: '700' },
  exercise: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  exerciseHeader: { alignItems: 'center', flexDirection: 'row', padding: Spacing.md },
  exerciseName: { flex: 1, fontSize: 18, fontWeight: '800' },
  exerciseVolume: { fontSize: 14, fontWeight: '800' },
  setRow: {
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  setHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  setNameRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  setName: { fontSize: 15, fontWeight: '700' },
  setType: { fontSize: 12, fontWeight: '700' },
  status: { fontSize: 13, fontWeight: '700' },
  valuesRow: { flexDirection: 'row', gap: Spacing.md },
  valueGroup: { flex: 1, gap: Spacing.xs },
  valueLabel: { fontSize: 12, fontWeight: '700' },
  value: { fontSize: 15, fontWeight: '700' },
});
