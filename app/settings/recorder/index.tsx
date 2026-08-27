import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { IconAction } from '@/src/components/ui/IconAction';
import { ScreenMessage } from '@/src/components/ui/ScreenMessage';
import { DEFAULT_RECORD_WORKOUT_DAYS } from '@/src/data/recordWorkoutPresets';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';
import type { RecorderDay } from '@/src/models';
import { useSettingsStore } from '@/src/store';
import { confirmAction } from '@/src/utils/confirm';
import { createId } from '@/src/utils/id';

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export default function RecorderSettingsScreen() {
  const palette = Colors[useResolvedColorScheme()];
  const days = useSettingsStore((state) => state.settings.recordWorkoutDays);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const [dayNameDrafts, setDayNameDrafts] = useState<Record<string, string>>({});
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, string>>({});
  const [newDayName, setNewDayName] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveDays = async (recordWorkoutDays: RecorderDay[]) => {
    setWorking(true);
    setError(null);
    try {
      await updateSettings({ recordWorkoutDays });
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update recorder');
      return false;
    } finally {
      setWorking(false);
    }
  };

  const addDay = async () => {
    const name = newDayName.trim();
    if (!name) {
      setError('Enter a day name first.');
      return;
    }
    if (days.some((day) => normalize(day.name) === normalize(name))) {
      setError('A recorder day with that name already exists.');
      return;
    }

    const saved = await saveDays([...days, { id: createId(), name, exercises: [] }]);
    if (saved) setNewDayName('');
  };

  const renameDay = async (day: RecorderDay) => {
    const name = (dayNameDrafts[day.id] ?? day.name).trim();
    if (name === day.name) return;
    if (!name) {
      setDayNameDrafts((drafts) => ({ ...drafts, [day.id]: day.name }));
      setError('Day names cannot be empty.');
      return;
    }
    if (days.some((item) => item.id !== day.id && normalize(item.name) === normalize(name))) {
      setError('A recorder day with that name already exists.');
      return;
    }

    const saved = await saveDays(
      days.map((item) => (item.id === day.id ? { ...item, name } : item))
    );
    if (saved) setDayNameDrafts((drafts) => ({ ...drafts, [day.id]: name }));
  };

  const addExercise = async (day: RecorderDay) => {
    const exerciseName = (exerciseDrafts[day.id] ?? '').trim();
    if (!exerciseName) {
      setError('Enter an exercise name first.');
      return;
    }
    if (day.exercises.some((exercise) => normalize(exercise) === normalize(exerciseName))) {
      setError(`${exerciseName} is already listed under ${day.name}.`);
      return;
    }

    const saved = await saveDays(
      days.map((item) =>
        item.id === day.id
          ? { ...item, exercises: [...item.exercises, exerciseName] }
          : item
      )
    );
    if (saved) setExerciseDrafts((drafts) => ({ ...drafts, [day.id]: '' }));
  };

  const removeExercise = async (day: RecorderDay, exerciseName: string) => {
    await saveDays(
      days.map((item) =>
        item.id === day.id
          ? {
              ...item,
              exercises: item.exercises.filter(
                (exercise) => normalize(exercise) !== normalize(exerciseName)
              ),
            }
          : item
      )
    );
  };

  const removeDay = async (day: RecorderDay) => {
    if (days.length === 1) {
      setError('Keep at least one recorder day. You can rename it or remove all its exercises.');
      return;
    }
    await saveDays(days.filter((item) => item.id !== day.id));
  };

  const restoreDefaults = async () => {
    await saveDays(
      DEFAULT_RECORD_WORKOUT_DAYS.map((day) => ({
        ...day,
        exercises: [...day.exercises],
      }))
    );
    setDayNameDrafts({});
    setExerciseDrafts({});
  };

  return (
    <AppScreen>
      <Stack.Screen options={{ title: 'Workout recorder' }} />
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>
          Recorder shortcuts
        </Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          These days and exercises appear when you start Record Workout. You can still enter an
          unlisted exercise during any workout.
        </Text>
      </View>

      {error ? <ScreenMessage body={error} error title="Recorder not updated" /> : null}

      {days.map((day) => (
        <View
          key={day.id}
          style={[styles.dayCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.dayHeader}>
            <View style={styles.dayNameField}>
              <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>DAY NAME</Text>
              <TextInput
                accessibilityLabel={`Name for ${day.name}`}
                editable={!working}
                maxLength={80}
                onBlur={() => void renameDay(day)}
                onChangeText={(name) =>
                  setDayNameDrafts((drafts) => ({ ...drafts, [day.id]: name }))
                }
                style={[
                  styles.dayNameInput,
                  { borderColor: palette.border, color: palette.text },
                ]}
                value={dayNameDrafts[day.id] ?? day.name}
              />
            </View>
            <IconAction
              danger
              disabled={working}
              icon="delete-outline"
              label={`Delete ${day.name}`}
              onPress={() =>
                confirmAction(
                  'Delete recorder day?',
                  `Delete ${day.name} and its exercise shortcuts? Workout history will not be changed.`,
                  () => void removeDay(day)
                )
              }
            />
          </View>

          <View style={styles.exerciseHeading}>
            <Text style={[styles.sectionLabel, { color: palette.text }]}>Exercise shortcuts</Text>
            <Text style={[styles.count, { color: palette.textMuted }]}>{day.exercises.length}</Text>
          </View>
          {day.exercises.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              No shortcuts yet. Add one below, or type an exercise during the workout.
            </Text>
          ) : (
            <View style={[styles.exerciseList, { borderColor: palette.border }]}>
              {day.exercises.map((exercise, index) => (
                <View
                  key={normalize(exercise)}
                  style={[
                    styles.exerciseRow,
                    index > 0 && {
                      borderTopColor: palette.border,
                      borderTopWidth: StyleSheet.hairlineWidth,
                    },
                  ]}>
                  <MaterialIcons color={palette.icon} name="fitness-center" size={19} />
                  <Text style={[styles.exerciseName, { color: palette.text }]}>{exercise}</Text>
                  <IconAction
                    danger
                    disabled={working}
                    icon="close"
                    label={`Remove ${exercise} from ${day.name}`}
                    onPress={() => void removeExercise(day, exercise)}
                  />
                </View>
              ))}
            </View>
          )}

          <View style={styles.addRow}>
            <TextInput
              accessibilityLabel={`New exercise for ${day.name}`}
              editable={!working}
              maxLength={80}
              onChangeText={(exercise) =>
                setExerciseDrafts((drafts) => ({ ...drafts, [day.id]: exercise }))
              }
              onSubmitEditing={() => void addExercise(day)}
              placeholder="Add exercise"
              placeholderTextColor={palette.textMuted}
              returnKeyType="done"
              style={[
                styles.input,
                { backgroundColor: palette.surfaceMuted, borderColor: palette.border, color: palette.text },
              ]}
              value={exerciseDrafts[day.id] ?? ''}
            />
            <AppButton
              disabled={working || !(exerciseDrafts[day.id] ?? '').trim()}
              icon="add"
              label="Add"
              onPress={() => void addExercise(day)}
              style={styles.addButton}
            />
          </View>
        </View>
      ))}

      <View style={[styles.newDayCard, { backgroundColor: palette.surfaceMuted }]}>
        <Text style={[styles.sectionLabel, { color: palette.text }]}>Add another day</Text>
        <TextInput
          accessibilityLabel="New recorder day name"
          editable={!working}
          maxLength={80}
          onChangeText={setNewDayName}
          onSubmitEditing={() => void addDay()}
          placeholder="Example: Arms Day"
          placeholderTextColor={palette.textMuted}
          returnKeyType="done"
          style={[
            styles.input,
            { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
          ]}
          value={newDayName}
        />
        <AppButton
          disabled={working || !newDayName.trim()}
          icon="add"
          label="Add recorder day"
          loading={working}
          onPress={() => void addDay()}
        />
      </View>

      <AppButton
        disabled={working}
        icon="restart-alt"
        label="Restore built-in recorder days"
        onPress={() =>
          confirmAction(
            'Restore built-in recorder days?',
            'This replaces your customized recorder days and exercise shortcuts. Workout history will not be changed.',
            () => void restoreDefaults(),
            'Restore defaults'
          )
        }
        variant="secondary"
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: Spacing.xs, marginBottom: Spacing.sm },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 21 },
  dayCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
    padding: Spacing.md,
  },
  dayHeader: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  dayNameField: { flex: 1, gap: Spacing.xs },
  fieldLabel: { fontSize: 11, fontWeight: '800' },
  dayNameInput: {
    borderBottomWidth: 1,
    fontSize: 20,
    fontWeight: '800',
    minHeight: TouchTarget.minimum,
    paddingVertical: Spacing.xs,
  },
  exerciseHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionLabel: { fontSize: 16, fontWeight: '800' },
  count: { fontSize: 13, fontWeight: '700' },
  emptyText: { fontSize: 13, lineHeight: 19 },
  exerciseList: { borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  exerciseRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm, minHeight: 52, paddingLeft: Spacing.md },
  exerciseName: { flex: 1, fontSize: 15, fontWeight: '700' },
  addRow: { alignItems: 'stretch', flexDirection: 'row', gap: Spacing.sm },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    flex: 1,
    fontSize: 16,
    minHeight: TouchTarget.primary,
    paddingHorizontal: Spacing.md,
  },
  addButton: { minWidth: 96 },
  newDayCard: { borderRadius: Radius.md, gap: Spacing.md, padding: Spacing.md },
});
