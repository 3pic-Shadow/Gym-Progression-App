import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';

export interface ExerciseOption {
  id: string;
  name: string;
  targetWeightKg: number;
  targetReps: number;
  restSeconds: number;
}

export interface TemporarySetSelection {
  sourceExerciseId?: string;
  exerciseName?: string;
  count: 1 | 2;
  targetWeightKg: number;
  targetReps: number;
  restSeconds: number;
}

interface AddTemporarySetModalProps {
  exercises: ExerciseOption[];
  defaultRestSeconds: number;
  onAdd: (selection: TemporarySetSelection) => Promise<void>;
  onDismiss: () => void;
  visible: boolean;
}

export function AddTemporarySetModal({
  exercises,
  defaultRestSeconds,
  onAdd,
  onDismiss,
  visible,
}: AddTemporarySetModalProps) {
  const palette = Colors[useResolvedColorScheme()];
  const insets = useSafeAreaInsets();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [customSelected, setCustomSelected] = useState(false);
  const [customName, setCustomName] = useState('');
  const [count, setCount] = useState<1 | 2>(1);
  const [targetWeight, setTargetWeight] = useState('0');
  const [targetReps, setTargetReps] = useState('8');
  const [restSeconds, setRestSeconds] = useState(String(defaultRestSeconds));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setSelectedExerciseId(null);
    setCustomSelected(false);
    setCustomName('');
    setCount(1);
    setTargetWeight('0');
    setTargetReps('8');
    setRestSeconds(String(defaultRestSeconds));
    setSubmitting(false);
    setError(null);
  }, [defaultRestSeconds, visible]);

  const close = () => {
    if (!submitting) {
      onDismiss();
    }
  };

  const submit = async () => {
    const trimmedName = customName.trim();
    if (!selectedExerciseId && (!customSelected || !trimmedName)) {
      setError('Choose an exercise or enter a name.');
      return;
    }
    const parsedWeight = Number(targetWeight);
    const parsedReps = Number(targetReps);
    const parsedRest = Number(restSeconds);
    if (!Number.isFinite(parsedWeight) || parsedWeight < 0 || parsedWeight > 1000) {
      setError('Target weight must be between 0 and 1000 kg.');
      return;
    }
    if (!Number.isInteger(parsedReps) || parsedReps < 1 || parsedReps > 1000) {
      setError('Target repetitions must be a whole number from 1 to 1000.');
      return;
    }
    if (!Number.isInteger(parsedRest) || parsedRest < 0 || parsedRest > 3600) {
      setError('Rest must be a whole number from 0 to 3600 seconds.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onAdd({
        sourceExerciseId: selectedExerciseId ?? undefined,
        exerciseName: customSelected ? trimmedName : undefined,
        count,
        targetWeightKg: parsedWeight,
        targetReps: parsedReps,
        restSeconds: parsedRest,
      });
      onDismiss();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Unable to add the set');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = Boolean(selectedExerciseId || (customSelected && customName.trim()));

  return (
    <Modal
      animationType="slide"
      onRequestClose={close}
      statusBarTranslucent
      transparent
      visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Close add set"
          accessibilityRole="button"
          onPress={close}
          style={styles.backdrop}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: palette.background,
              borderColor: palette.border,
              paddingBottom: Math.max(Spacing.md, insets.bottom),
            },
          ]}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>
              Add set
            </Text>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              disabled={submitting}
              hitSlop={8}
              onPress={close}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: palette.surfaceMuted },
                pressed && styles.pressed,
              ]}>
              <MaterialIcons color={palette.icon} name="close" size={24} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionLabel, { color: palette.text }]}>Exercise</Text>
            <View style={styles.options}>
              {exercises.map((exercise) => {
                const selected = selectedExerciseId === exercise.id && !customSelected;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={exercise.id}
                    onPress={() => {
                      setSelectedExerciseId(exercise.id);
                      setCustomSelected(false);
                      setTargetWeight(String(exercise.targetWeightKg));
                      setTargetReps(String(exercise.targetReps));
                      setRestSeconds(String(exercise.restSeconds));
                      setError(null);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        backgroundColor: selected ? palette.surfaceMuted : palette.surface,
                        borderColor: selected ? palette.tint : palette.border,
                      },
                      pressed && styles.pressed,
                    ]}>
                    <Text style={[styles.optionText, { color: palette.text }]}>
                      {exercise.name}
                    </Text>
                    {selected ? (
                      <MaterialIcons color={palette.tint} name="check-circle" size={22} />
                    ) : null}
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: customSelected }}
                onPress={() => {
                  setSelectedExerciseId(null);
                  setCustomSelected(true);
                  setTargetWeight('0');
                  setTargetReps('8');
                  setRestSeconds(String(defaultRestSeconds));
                  setError(null);
                }}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: customSelected ? palette.surfaceMuted : palette.surface,
                    borderColor: customSelected ? palette.tint : palette.border,
                  },
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.optionText, { color: palette.text }]}>Other</Text>
                {customSelected ? (
                  <MaterialIcons color={palette.tint} name="check-circle" size={22} />
                ) : null}
              </Pressable>
            </View>

            {customSelected ? (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>Exercise name</Text>
                <TextInput
                  accessibilityLabel="Exercise name"
                  autoCapitalize="words"
                  autoFocus
                  maxLength={80}
                  onChangeText={(value) => {
                    setCustomName(value);
                    setError(null);
                  }}
                  placeholder="Exercise name"
                  placeholderTextColor={palette.textMuted}
                  returnKeyType="done"
                  style={[
                    styles.input,
                    {
                      backgroundColor: palette.surface,
                      borderColor: error ? palette.danger : palette.border,
                      color: palette.text,
                    },
                  ]}
                  value={customName}
                />
              </View>
            ) : null}

            {selectedExerciseId || customSelected ? (
              <>
                <Text style={[styles.sectionLabel, { color: palette.text }]}>Set details</Text>
                <View style={styles.detailRow}>
                  <View style={styles.detailField}>
                    <Text style={[styles.fieldLabel, { color: palette.text }]}>Weight (kg)</Text>
                    <TextInput
                      accessibilityLabel="Target weight in kilograms"
                      keyboardType="decimal-pad"
                      onChangeText={setTargetWeight}
                      selectTextOnFocus
                      style={[
                        styles.detailInput,
                        {
                          backgroundColor: palette.surface,
                          borderColor: palette.border,
                          color: palette.text,
                        },
                      ]}
                      value={targetWeight}
                    />
                  </View>
                  <View style={styles.detailField}>
                    <Text style={[styles.fieldLabel, { color: palette.text }]}>Reps</Text>
                    <TextInput
                      accessibilityLabel="Target repetitions"
                      keyboardType="number-pad"
                      onChangeText={setTargetReps}
                      selectTextOnFocus
                      style={[
                        styles.detailInput,
                        {
                          backgroundColor: palette.surface,
                          borderColor: palette.border,
                          color: palette.text,
                        },
                      ]}
                      value={targetReps}
                    />
                  </View>
                  <View style={styles.detailField}>
                    <Text style={[styles.fieldLabel, { color: palette.text }]}>Rest (sec)</Text>
                    <TextInput
                      accessibilityLabel="Rest after set in seconds"
                      keyboardType="number-pad"
                      onChangeText={setRestSeconds}
                      selectTextOnFocus
                      style={[
                        styles.detailInput,
                        {
                          backgroundColor: palette.surface,
                          borderColor: palette.border,
                          color: palette.text,
                        },
                      ]}
                      value={restSeconds}
                    />
                  </View>
                </View>
              </>
            ) : null}

            <Text style={[styles.sectionLabel, { color: palette.text }]}>Number of sets</Text>
            <View style={[styles.segmented, { backgroundColor: palette.surfaceMuted }]}>
              {([1, 2] as const).map((option) => {
                const selected = count === option;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={option}
                    onPress={() => setCount(option)}
                    style={[
                      styles.segment,
                      selected && {
                        backgroundColor: palette.surface,
                        borderColor: palette.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.segmentText,
                        { color: selected ? palette.tint : palette.textMuted },
                      ]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit || submitting}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.submit,
              { backgroundColor: palette.tint },
              pressed && styles.pressed,
              (!canSubmit || submitting) && styles.disabled,
            ]}>
            {submitting ? (
              <ActivityIndicator color={palette.tintContrast} />
            ) : (
              <>
                <MaterialIcons color={palette.tintContrast} name="add" size={20} />
                <Text style={[styles.submitText, { color: palette.tintContrast }]}>
                  {count === 1 ? 'Add set' : 'Add 2 sets'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  sheet: {
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
    maxHeight: '88%',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: { fontSize: 22, fontWeight: '800' },
  closeButton: {
    alignItems: 'center',
    borderRadius: Radius.md,
    height: TouchTarget.minimum,
    justifyContent: 'center',
    width: TouchTarget.minimum,
  },
  content: { gap: Spacing.md, paddingBottom: Spacing.xs },
  sectionLabel: { fontSize: 15, fontWeight: '800' },
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
  optionText: { flex: 1, fontSize: 16, fontWeight: '700' },
  field: { gap: Spacing.xs },
  fieldLabel: { fontSize: 14, fontWeight: '700' },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 16,
    minHeight: TouchTarget.primary,
    paddingHorizontal: Spacing.md,
  },
  detailRow: { flexDirection: 'row', gap: Spacing.sm },
  detailField: { flex: 1, gap: Spacing.xs },
  detailInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '700',
    minHeight: TouchTarget.primary,
    minWidth: 0,
    paddingHorizontal: Spacing.sm,
    textAlign: 'center',
  },
  segmented: { borderRadius: Radius.md, flexDirection: 'row', padding: 3 },
  segment: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: 'center',
    minHeight: TouchTarget.minimum,
  },
  segmentText: { fontSize: 16, fontWeight: '800' },
  error: { fontSize: 13, lineHeight: 18 },
  submit: {
    alignItems: 'center',
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    minHeight: TouchTarget.primary,
    paddingHorizontal: Spacing.md,
  },
  submitText: { fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
});
