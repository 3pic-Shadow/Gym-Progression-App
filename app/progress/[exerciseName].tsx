import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ScreenMessage } from '@/src/components/ui/ScreenMessage';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';
import { useSessionStore } from '@/src/store';
import {
  formatVolume,
  getExerciseProgressSummaries,
  getExerciseSessionHistory,
  getExerciseWeeklyVolumes,
  normalizeExerciseName,
} from '@/src/utils/progressionAnalytics';
import { routes } from '@/src/utils/routes';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatWeek(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function ExerciseProgressScreen() {
  const { exerciseName = '' } = useLocalSearchParams<{ exerciseName: string }>();
  const palette = Colors[useResolvedColorScheme()];
  const history = useSessionStore((state) => state.history);
  const summary = getExerciseProgressSummaries(history).find(
    (item) => normalizeExerciseName(item.name) === normalizeExerciseName(exerciseName)
  );
  const sessions = getExerciseSessionHistory(history, exerciseName);
  const weeklyVolumes = getExerciseWeeklyVolumes(history, exerciseName);
  const maximumWeeklyVolume = Math.max(...weeklyVolumes.map((week) => week.volumeKg), 1);

  if (!summary) {
    return (
      <AppScreen>
        <Stack.Screen options={{ title: 'Exercise progress' }} />
        <ScreenMessage error title="Exercise history not found" />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <Stack.Screen options={{ title: summary.name }} />
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>
          {summary.name}
        </Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          {summary.sessions} sessions | {summary.completedSets} completed sets
        </Text>
      </View>

      <View style={styles.metricBand}>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: palette.text }]}>
            {summary.best?.weightKg ?? 0} kg
          </Text>
          <Text style={[styles.metricLabel, { color: palette.textMuted }]}>best weight</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: palette.text }]}>
            {formatVolume(summary.totalVolumeKg)}
          </Text>
          <Text style={[styles.metricLabel, { color: palette.textMuted }]}>total volume</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: palette.warning }]}>
            {summary.savedPersonalRecords.length}
          </Text>
          <Text style={[styles.metricLabel, { color: palette.textMuted }]}>saved PRs</Text>
        </View>
      </View>

      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>
        Weekly {summary.name} volume
      </Text>
      <View style={styles.weekList}>
        {weeklyVolumes.map((week) => {
          const width = `${Math.round((week.volumeKg / maximumWeeklyVolume) * 100)}%` as DimensionValue;
          return (
            <View key={week.weekStart} style={styles.weekRow}>
              <Text style={[styles.weekLabel, { color: palette.textMuted }]}>
                {formatWeek(week.weekStart)}
              </Text>
              <View style={[styles.barTrack, { backgroundColor: palette.surfaceMuted }]}>
                <View style={[styles.barFill, { backgroundColor: palette.tint, width }]} />
              </View>
              <Text style={[styles.weekValue, { color: palette.text }]}>
                {formatVolume(week.volumeKg)}
              </Text>
            </View>
          );
        })}
      </View>

      {summary.savedPersonalRecords.length > 0 ? (
        <View style={[styles.prBand, { backgroundColor: palette.surfaceMuted }]}>
          <MaterialIcons color={palette.warning} name="emoji-events" size={24} />
          <View style={styles.prCopy}>
            <Text style={[styles.prTitle, { color: palette.text }]}>Latest saved PR</Text>
            <Text style={[styles.prValue, { color: palette.text }]}>
              {summary.savedPersonalRecords[0].weightKg} kg x{' '}
              {summary.savedPersonalRecords[0].reps}
            </Text>
            <Text style={[styles.sessionMeta, { color: palette.textMuted }]}>
              {formatDate(summary.savedPersonalRecords[0].completedAt)}
            </Text>
          </View>
        </View>
      ) : null}

      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>
        Training history
      </Text>
      {sessions.map((session) => (
        <Pressable
          accessibilityRole="button"
          key={session.sessionId}
          onPress={() => router.push(routes.historySession(session.sessionId))}
          style={({ pressed }) => [
            styles.session,
            { backgroundColor: palette.surface, borderColor: palette.border },
            pressed && styles.pressed,
          ]}>
          <View style={styles.sessionHeading}>
            <View style={styles.sessionCopy}>
              <Text style={[styles.sessionDate, { color: palette.text }]}>
                {formatDate(session.completedAt)}
              </Text>
              <Text style={[styles.sessionMeta, { color: palette.textMuted }]}>
                {session.planName} | {formatVolume(session.volumeKg)}
              </Text>
            </View>
            <MaterialIcons color={palette.icon} name="chevron-right" size={24} />
          </View>
          {session.sets.map((set, index) => (
            <View
              key={`${set.completedAt}-${index}`}
              style={[
                styles.setRow,
                index > 0 && { borderTopColor: palette.border, borderTopWidth: StyleSheet.hairlineWidth },
              ]}>
              <Text style={[styles.setLabel, { color: palette.textMuted }]}>Set {index + 1}</Text>
              <Text style={[styles.setValue, { color: palette.text }]}>
                {set.weightKg} kg x {set.reps}
              </Text>
              {set.isPersonalRecord ? (
                <MaterialIcons color={palette.warning} name="emoji-events" size={18} />
              ) : (
                <View style={styles.iconSpacer} />
              )}
            </View>
          ))}
        </Pressable>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: Spacing.xs },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14 },
  metricBand: { flexDirection: 'row', paddingVertical: Spacing.md },
  metric: { alignItems: 'center', flex: 1, gap: Spacing.xs, justifyContent: 'center' },
  metricValue: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  metricLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  divider: { width: StyleSheet.hairlineWidth },
  prBand: { alignItems: 'center', borderRadius: Radius.md, flexDirection: 'row', gap: Spacing.md, padding: Spacing.md },
  prCopy: { flex: 1, gap: Spacing.xs },
  prTitle: { fontSize: 13, fontWeight: '700' },
  prValue: { fontSize: 20, fontWeight: '800' },
  sectionTitle: { fontSize: 20, fontWeight: '800', marginTop: Spacing.sm },
  weekList: { gap: Spacing.sm },
  weekRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm, minHeight: 32 },
  weekLabel: { fontSize: 12, width: 48 },
  barTrack: { borderRadius: Radius.sm, flex: 1, height: 12, overflow: 'hidden' },
  barFill: { borderRadius: Radius.sm, height: 12 },
  weekValue: { fontSize: 12, fontWeight: '700', textAlign: 'right', width: 72 },
  session: { borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.md },
  sessionHeading: { alignItems: 'center', flexDirection: 'row' },
  sessionCopy: { flex: 1, gap: Spacing.xs },
  sessionDate: { fontSize: 16, fontWeight: '800' },
  sessionMeta: { fontSize: 13 },
  setRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm, minHeight: 42 },
  setLabel: { fontSize: 13, width: 44 },
  setValue: { flex: 1, fontSize: 15, fontWeight: '700' },
  iconSpacer: { width: 18 },
  pressed: { opacity: 0.7 },
});
