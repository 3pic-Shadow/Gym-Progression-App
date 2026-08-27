import { useState } from 'react';
import { Text } from 'react-native';
import { z } from 'zod';

import { Colors } from '@/constants/theme';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { FormField } from '@/src/components/ui/FormField';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';
import { useSettingsStore } from '@/src/store';
import type { ExerciseInput } from '@/src/store/plansStore';
import { exerciseInputSchema } from '@/src/validation';

interface ExerciseFormProps {
  initialValue?: ExerciseInput;
  submitLabel: string;
  onSubmit: (input: ExerciseInput) => Promise<void>;
}

interface FormErrors {
  name?: string;
  notes?: string;
  defaultRestSeconds?: string;
  form?: string;
}

function numberFromInput(value: string) {
  return value.trim() === '' ? Number.NaN : Number(value);
}

export function ExerciseForm({ initialValue, submitLabel, onSubmit }: ExerciseFormProps) {
  const palette = Colors[useResolvedColorScheme()];
  const configuredDefaultRestSeconds = useSettingsStore(
    (state) => state.settings.defaultRestSeconds
  );
  const [name, setName] = useState(initialValue?.name ?? '');
  const [notes, setNotes] = useState(initialValue?.notes ?? '');
  const [defaultRestSeconds, setDefaultRestSeconds] = useState(
    String(initialValue?.defaultRestSeconds ?? configuredDefaultRestSeconds)
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const result = exerciseInputSchema.safeParse({
      name,
      notes: notes.trim() || undefined,
      defaultRestSeconds: numberFromInput(defaultRestSeconds),
    });

    if (!result.success) {
      const fields = z.flattenError(result.error).fieldErrors;
      setErrors({
        name: fields.name?.[0],
        notes: fields.notes?.[0],
        defaultRestSeconds: fields.defaultRestSeconds?.[0],
      });
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      await onSubmit(result.data);
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Unable to save exercise' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen
      footer={
        <AppButton label={submitLabel} loading={submitting} onPress={() => void submit()} />
      }>
      <FormField
        autoCapitalize="words"
        autoFocus
        error={errors.name}
        label="Exercise name"
        maxLength={80}
        onChangeText={setName}
        placeholder="Squats"
        value={name}
      />
      <FormField
        error={errors.notes}
        label="Notes"
        maxLength={500}
        multiline
        onChangeText={setNotes}
        placeholder="Optional form cues"
        value={notes}
      />
      <FormField
        error={errors.defaultRestSeconds}
        hint="0 to 3600 seconds"
        keyboardType="number-pad"
        label="Default rest (seconds)"
        onChangeText={setDefaultRestSeconds}
        value={defaultRestSeconds}
      />
      {errors.form ? <Text style={{ color: palette.danger }}>{errors.form}</Text> : null}
    </AppScreen>
  );
}
