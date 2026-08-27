import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ScreenMessage } from '@/src/components/ui/ScreenMessage';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';
import { useSessionStore } from '@/src/store';
import {
  formatVolume,
  getExerciseProgressSummaries,
  getExerciseWeeklyVolumes,
} from '@/src/utils/progressionAnalytics';
import { routes } from '@/src/utils/routes';

export default function ProgressScreen() {
  const palette = Colors[useResolvedColorScheme()];
  const history = useSessionStore((state) => state.history);
  const exerciseSummaries = getExerciseProgressSummaries(history);
  const savedPrCount = exerciseSummaries.reduce(
    (total, exercise) => total + exercise.savedPersonalRecords.length,
    0
  );
  const completedSetCount = exerciseSummaries.reduce(
    (total, exercise) => total + exercise.completedSets,
    0
  );

  return (
    <AppScreen>
      {history.length === 0 ? (
        <ScreenMessage
          body="Complete a workout to start recording weekly volume and exercise progress."
          title="No progress recorded"
        />
      ) : (
        <>
          <View style={styles.summaryBand}>
            <View style={styles.summaryMetric}>
              <Text style={[styles.summaryValue, { color: palette.text }]}>
                {exerciseSummaries.length}
              </Text>
              <Text style={[styles.summaryLabel, { color: palette.textMuted }]}>exercises</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
            <View style={styles.summaryMetric}>
              <Text style={[styles.summaryValue, { color: palette.text }]}>{completedSetCount}</Text>
              <Text style={[styles.summaryLabel, { color: palette.textMuted }]}>recorded sets</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
            <View style={styles.summaryMetric}>
              <Text style={[styles.summaryValue, { color: palette.text }]}>{savedPrCount}</Text>
              <Text style={[styles.summaryLabel, { color: palette.textMuted }]}>saved PRs</Text>
            </View>
          </View>

          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>
            Volume by exercise
          </Text>
          <Text style={[styles.sectionCopy, { color: palette.textMuted }]}>
            Each movement is tracked separately so unlike exercises are never combined.
          </Text>
          <View style={styles.exerciseList}>
            {exerciseSummaries.map((exercise) => {
              const weeklyVolumes = getExerciseWeeklyVolumes(history, exercise.name, 2);
              const previousWeek = weeklyVolumes[0]?.volumeKg ?? 0;
              const currentWeek = weeklyVolumes[1]?.volumeKg ?? 0;
              const volumeChange = currentWeek - previousWeek;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={exercise.name}
                  onPress={() => router.push(routes.exerciseProgress(exercise.name))}
                  style={({ pressed }) => [
                    styles.exerciseRow,
                    { backgroundColor: palette.surface, borderColor: palette.border },
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.exerciseCopy}>
                    <View style={styles.exerciseHeading}>
                      <Text style={[styles.exerciseName, { color: palette.text }]}>
                        {exercise.name}
                      </Text>
                      {exercise.savedPersonalRecords.length > 0 ? (
                        <MaterialIcons color={palette.warning} name="emoji-events" size={20} />
                      ) : null}
                    </View>
                    <Text style={[styles.exerciseVolume, { color: palette.text }]}>
                      {formatVolume(currentWeek)} this week
                    </Text>
                    <Text
                      style={[
                        styles.exerciseMeta,
                        { color: volumeChange >= 0 ? palette.success : palette.warning },
                      ]}>
                      {volumeChange >= 0 ? '+' : ''}{formatVolume(volumeChange)} vs last week
                    </Text>
                    <Text style={[styles.exerciseMeta, { color: palette.textMuted }]}>
                      {formatVolume(exercise.totalVolumeKg)} all time · Best{' '}
                      {exercise.best?.weightKg ?? 0} kg x {exercise.best?.reps ?? 0}
                    </Text>
                  </View>
                  <MaterialIcons color={palette.icon} name="chevron-right" size={24} />
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  summaryBand: {
    alignItems: 'stretch',
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
  },
  summaryMetric: { alignItems: 'center', flex: 1, gap: Spacing.xs, justifyContent: 'center' },
  summaryDivider: { width: StyleSheet.hairlineWidth },
  summaryValue: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  summaryLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '800', marginTop: Spacing.sm },
  sectionCopy: { fontSize: 14, lineHeight: 20 },
  exerciseList: { gap: Spacing.sm },
  exerciseRow: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 80,
    padding: Spacing.md,
  },
  exerciseCopy: { flex: 1, gap: Spacing.xs },
  exerciseHeading: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  exerciseName: { fontSize: 17, fontWeight: '800' },
  exerciseVolume: { fontSize: 16, fontWeight: '800' },
  exerciseMeta: { fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.7 },
});
