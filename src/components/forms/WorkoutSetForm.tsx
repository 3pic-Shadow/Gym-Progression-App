import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { Colors, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { FormField } from '@/src/components/ui/FormField';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';
import type { SetType } from '@/src/models';
import type { WorkoutSetInput } from '@/src/store/plansStore';
import { workoutSetInputSchema } from '@/src/validation';

interface WorkoutSetFormProps {
  initialValue: WorkoutSetInput;
  submitLabel: string;
  onSubmit: (input: WorkoutSetInput) => Promise<void>;
}

interface FormErrors {
  targetWeightKg?: string;
  targetReps?: string;
  restSeconds?: string;
  notes?: string;
  form?: string;
}

function numberFromInput(value: string) {
  return value.trim() === '' ? Number.NaN : Number(value);
}

export function WorkoutSetForm({ initialValue, submitLabel, onSubmit }: WorkoutSetFormProps) {
  const palette = Colors[useResolvedColorScheme()];
  const [type, setType] = useState<SetType>(initialValue.type);
  const [targetWeightKg, setTargetWeightKg] = useState(String(initialValue.targetWeightKg));
  const [targetReps, setTargetReps] = useState(String(initialValue.targetReps));
  const [restSeconds, setRestSeconds] = useState(String(initialValue.restSeconds));
  const [notes, setNotes] = useState(initialValue.notes ?? '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const result = workoutSetInputSchema.safeParse({
      type,
      targetWeightKg: numberFromInput(targetWeightKg),
      targetReps: numberFromInput(targetReps),
      restSeconds: numberFromInput(restSeconds),
      notes: notes.trim() || undefined,
    });

    if (!result.success) {
      const fields = z.flattenError(result.error).fieldErrors;
      setErrors({
        targetWeightKg: fields.targetWeightKg?.[0],
        targetReps: fields.targetReps?.[0],
        restSeconds: fields.restSeconds?.[0],
        notes: fields.notes?.[0],
      });
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      await onSubmit(result.data);
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Unable to save set' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen
      footer={
        <AppButton label={submitLabel} loading={submitting} onPress={() => void submit()} />
      }>
      <View style={styles.group}>
        <Text style={[styles.label, { color: palette.text }]}>Set type</Text>
        <View
          accessibilityRole="radiogroup"
          style={[styles.segmented, { backgroundColor: palette.surfaceMuted }]}>
          {(['warmup', 'working'] as const).map((option) => {
            const selected = option === type;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={option}
                onPress={() => setType(option)}
                style={[
                  styles.segment,
                  selected && { backgroundColor: palette.surface, borderColor: palette.border },
                ]}>
                <Text
                  style={[
                    styles.segmentText,
                    { color: selected ? palette.tint : palette.textMuted },
                  ]}>
                  {option === 'warmup' ? 'Warm-up' : 'Working'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <FormField
        error={errors.targetWeightKg}
        hint="0 to 1000 kg"
        keyboardType="decimal-pad"
        label="Target weight (kg)"
        onChangeText={setTargetWeightKg}
        value={targetWeightKg}
      />
      <FormField
        error={errors.targetReps}
        hint="1 to 1000 repetitions"
        keyboardType="number-pad"
        label="Target repetitions"
        onChangeText={setTargetReps}
        value={targetReps}
      />
      <FormField
        error={errors.restSeconds}
        hint="0 to 3600 seconds"
        keyboardType="number-pad"
        label="Rest after set (seconds)"
        onChangeText={setRestSeconds}
        value={restSeconds}
      />
      <FormField
        error={errors.notes}
        label="Note"
        maxLength={500}
        multiline
        onChangeText={setNotes}
        placeholder="Optional note for this set"
        value={notes}
      />
      {errors.form ? <Text style={{ color: palette.danger }}>{errors.form}</Text> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.xs },
  label: { fontSize: 14, fontWeight: '700' },
  segmented: {
    borderRadius: Radius.md,
    flexDirection: 'row',
    padding: 3,
  },
  segment: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: 'center',
    minHeight: TouchTarget.minimum,
  },
  segmentText: { fontSize: 15, fontWeight: '700' },
});
