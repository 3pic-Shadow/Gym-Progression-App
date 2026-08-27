import { useState } from 'react';
import { Text } from 'react-native';
import { z } from 'zod';

import { Colors } from '@/constants/theme';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { FormField } from '@/src/components/ui/FormField';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';
import type { PlanInput } from '@/src/store/plansStore';
import { workoutPlanInputSchema } from '@/src/validation';

interface PlanFormProps {
  initialValue?: PlanInput;
  submitLabel: string;
  onSubmit: (input: PlanInput) => Promise<void>;
}

interface FormErrors {
  name?: string;
  description?: string;
  form?: string;
}

export function PlanForm({ initialValue, submitLabel, onSubmit }: PlanFormProps) {
  const palette = Colors[useResolvedColorScheme()];
  const [name, setName] = useState(initialValue?.name ?? '');
  const [description, setDescription] = useState(initialValue?.description ?? '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const result = workoutPlanInputSchema.safeParse({
      name,
      description: description.trim() || undefined,
    });

    if (!result.success) {
      const fields = z.flattenError(result.error).fieldErrors;
      setErrors({
        name: fields.name?.[0],
        description: fields.description?.[0],
      });
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      await onSubmit(result.data);
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Unable to save plan' });
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
        label="Plan name"
        maxLength={80}
        onChangeText={setName}
        placeholder="Leg Day"
        returnKeyType="next"
        value={name}
      />
      <FormField
        error={errors.description}
        label="Description"
        maxLength={500}
        multiline
        onChangeText={setDescription}
        placeholder="Optional notes about this workout"
        value={description}
      />
      {errors.form ? <Text style={{ color: palette.danger }}>{errors.form}</Text> : null}
    </AppScreen>
  );
}
