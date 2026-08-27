import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { IconAction } from '@/src/components/ui/IconAction';
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

export default function HistoryScreen() {
  const history = useSessionStore((state) => state.history);
  const removeHistoryEntry = useSessionStore((state) => state.removeHistoryEntry);
  const palette = Colors[useResolvedColorScheme()];
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (sessionId: string) => {
    setDeletingId(sessionId);
    setError(null);
    try {
      await removeHistoryEntry(sessionId);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to delete workout');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppScreen>
      <Stack.Screen options={{ title: 'Workout history' }} />
      {history.length === 0 ? (
        <ScreenMessage body="Completed workouts will appear here." title="No workout history" />
      ) : null}
      {error ? <ScreenMessage body={error} error title="History not updated" /> : null}
      {history.map((session) => {
        const summary = getSessionSummary(session);
        return (
          <View
            key={session.id}
            style={[
              styles.card,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(routes.historySession(session.id))}
              style={({ pressed }) => [styles.detailsLink, pressed && styles.pressed]}>
              <View style={styles.copy}>
                <Text style={[styles.title, { color: palette.text }]}>
                  {session.planSnapshot.name}
                </Text>
                <Text style={[styles.meta, { color: palette.textMuted }]}>
                  {formatDate(session.completedAt ?? session.startedAt)}
                </Text>
                <Text style={[styles.meta, { color: palette.textMuted }]}>
                  {summary.completedSets} completed | {summary.skippedSets} skipped |{' '}
                  {formatSessionDuration(summary.durationMilliseconds)}
                </Text>
                <Text style={[styles.meta, { color: palette.textMuted }]}>
                  {summary.exerciseVolumes.length === 0
                    ? 'No exercise volume recorded'
                    : summary.exerciseVolumes
                        .map((exercise) => `${exercise.name} ${formatVolume(exercise.volumeKg)}`)
                        .join(' · ')}
                  {summary.personalRecords > 0 ? ` · ${summary.personalRecords} PR` : ''}
                </Text>
              </View>
              <MaterialIcons color={palette.icon} name="chevron-right" size={24} />
            </Pressable>
            <IconAction
              danger
              disabled={deletingId === session.id}
              icon="delete-outline"
              label={`Delete ${session.planSnapshot.name} from history`}
              onPress={() =>
                confirmAction(
                  'Delete workout?',
                  `Delete this ${session.planSnapshot.name} workout from history?`,
                  () => void remove(session.id)
                )
              }
            />
          </View>
        );
      })}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  detailsLink: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    minHeight: 72,
    padding: Spacing.sm,
  },
  copy: { flex: 1, gap: Spacing.xs },
  title: { fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 14, lineHeight: 20 },
  pressed: { opacity: 0.7 },
});
