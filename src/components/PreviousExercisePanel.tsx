import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';
import type { ExerciseSessionPerformance } from '@/src/utils/progressionAnalytics';

interface PreviousExercisePanelProps {
  session: ExerciseSessionPerformance;
  visible: boolean;
  onToggle: () => void;
}

export function PreviousExercisePanel({
  session,
  visible,
  onToggle,
}: PreviousExercisePanelProps) {
  const palette = Colors[useResolvedColorScheme()];

  return (
    <View style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.heading}>
        <Text style={[styles.label, { color: palette.textMuted }]}>LAST SESSION</Text>
        <Pressable
          accessibilityLabel={`${visible ? 'Hide' : 'Show'} last-session history`}
          accessibilityRole="button"
          onPress={onToggle}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
          <MaterialIcons
            color={palette.tint}
            name={visible ? 'visibility-off' : 'visibility'}
            size={19}
          />
          <Text style={[styles.toggleLabel, { color: palette.tint }]}>
            {visible ? 'Hide' : 'Show'}
          </Text>
        </Pressable>
      </View>
      {visible ? (
        <>
          <Text style={[styles.value, { color: palette.text }]}>
            {session.sets.map((set) => `${set.weightKg} kg x ${set.reps}`).join('  |  ')}
          </Text>
          <Text style={[styles.meta, { color: palette.textMuted }]}>
            {Math.round(session.volumeKg).toLocaleString()} kg exercise volume
          </Text>
        </>
      ) : (
        <Text style={[styles.hiddenHint, { color: palette.textMuted }]}>History hidden</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 12, fontWeight: '800' },
  toggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.xs,
    minHeight: TouchTarget.minimum,
    paddingHorizontal: Spacing.xs,
  },
  toggleLabel: { fontSize: 13, fontWeight: '800' },
  value: { fontSize: 15, fontWeight: '700', lineHeight: 22 },
  meta: { fontSize: 13 },
  hiddenHint: { fontSize: 13 },
  pressed: { opacity: 0.65 },
});
