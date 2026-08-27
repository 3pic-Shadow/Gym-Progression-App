import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ScreenMessage } from '@/src/components/ui/ScreenMessage';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';
import { useSessionStore, useSettingsStore } from '@/src/store';
import { routes } from '@/src/utils/routes';

export default function RecordWorkoutSetupScreen() {
  const palette = Colors[useResolvedColorScheme()];
  const activeSession = useSessionStore((state) => state.activeSession);
  const startRecordedWorkout = useSessionStore((state) => state.startRecordedWorkout);
  const configuredDays = useSettingsStore((state) => state.settings.recordWorkoutDays);
  const [selectedDayId, setSelectedDayId] = useState(configuredDays[0]?.id ?? '');
  const [customDay, setCustomDay] = useState('');
  const [usingCustomDay, setUsingCustomDay] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedDay = configuredDays.find((day) => day.id === selectedDayId);
  const dayName = usingCustomDay ? customDay.trim() : (selectedDay?.name ?? '');

  useEffect(() => {
    if (!configuredDays.some((day) => day.id === selectedDayId)) {
      setSelectedDayId(configuredDays[0]?.id ?? '');
    }
  }, [configuredDays, selectedDayId]);

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      const sessionId = await startRecordedWorkout(dayName);
      router.replace(routes.recordWorkout(sessionId));
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Unable to start recording');
    } finally {
      setStarting(false);
    }
  };

  return (
    <AppScreen
      footer={
        <AppButton
          disabled={Boolean(activeSession) || !dayName}
          label="Start recording"
          loading={starting}
          onPress={() => void start()}
        />
      }>
      <Stack.Screen options={{ title: 'Record workout' }} />
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>
          What day is it?
        </Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          Choose a day to get exercise shortcuts, or create your own name.
        </Text>
      </View>

      {activeSession ? (
        <ScreenMessage
          body="Finish or discard your active workout before starting another."
          error
          title="Workout already active"
        />
      ) : null}
      {error ? <ScreenMessage body={error} error title="Could not start recording" /> : null}

      <View style={styles.options}>
        {configuredDays.map((day) => {
          const selected = !usingCustomDay && selectedDayId === day.id;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={day.id}
              onPress={() => {
                setUsingCustomDay(false);
                setSelectedDayId(day.id);
              }}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: selected ? palette.surfaceMuted : palette.surface,
                  borderColor: selected ? palette.tint : palette.border,
                },
                pressed && styles.pressed,
              ]}>
              <View style={styles.optionCopy}>
                <Text style={[styles.optionLabel, { color: palette.text }]}>{day.name}</Text>
                <Text style={[styles.optionMeta, { color: palette.textMuted }]}>
                  {day.exercises.length}{' '}
                  {day.exercises.length === 1 ? 'exercise shortcut' : 'exercise shortcuts'}
                </Text>
              </View>
              <MaterialIcons
                color={selected ? palette.tint : palette.icon}
                name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={24}
              />
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: usingCustomDay }}
          onPress={() => setUsingCustomDay(true)}
          style={({ pressed }) => [
            styles.option,
            {
              backgroundColor: usingCustomDay ? palette.surfaceMuted : palette.surface,
              borderColor: usingCustomDay ? palette.tint : palette.border,
            },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.optionLabel, { color: palette.text }]}>Create a new day</Text>
          <MaterialIcons
            color={usingCustomDay ? palette.tint : palette.icon}
            name={usingCustomDay ? 'radio-button-checked' : 'radio-button-unchecked'}
            size={24}
          />
        </Pressable>
      </View>

      {usingCustomDay ? (
        <View style={styles.field}>
          <Text style={[styles.label, { color: palette.text }]}>Day name</Text>
          <TextInput
            accessibilityLabel="Custom workout day name"
            autoFocus
            maxLength={80}
            onChangeText={setCustomDay}
            placeholder="Example: Arms and shoulders"
            placeholderTextColor={palette.textMuted}
            style={[
              styles.input,
              { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
            ]}
            value={customDay}
          />
        </View>
      ) : null}
      <AppButton
        icon="tune"
        label="Manage recorder days"
        onPress={() => router.push(routes.recorderSettings)}
        variant="ghost"
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: Spacing.xs, marginBottom: Spacing.sm },
  title: { fontSize: 30, fontWeight: '800' },
  subtitle: { fontSize: 15, lineHeight: 22 },
  options: { gap: Spacing.sm },
  option: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: TouchTarget.primary,
    paddingHorizontal: Spacing.md,
  },
  optionLabel: { fontSize: 16, fontWeight: '700' },
  optionCopy: { flex: 1, gap: Spacing.xs },
  optionMeta: { fontSize: 12 },
  field: { gap: Spacing.xs, marginTop: Spacing.sm },
  label: { fontSize: 14, fontWeight: '700' },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 17,
    minHeight: TouchTarget.primary,
    paddingHorizontal: Spacing.md,
  },
  pressed: { opacity: 0.7 },
});
