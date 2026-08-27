import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors, Spacing, ThemeTokens, TouchTarget } from '@/constants/theme';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
}

export function FormField({ label, error, hint, style, ...props }: FormFieldProps) {
  const colorScheme = useResolvedColorScheme();
  const palette = Colors[colorScheme];
  const tokens = ThemeTokens[colorScheme];

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={palette.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: palette.surface,
            borderColor: error ? palette.danger : palette.border,
            color: palette.text,
            borderRadius: tokens.radius,
            borderWidth: tokens.borderWidth,
          },
          props.multiline && styles.multiline,
          style,
        ]}
        {...props}
      />
      {error ? <Text style={[styles.support, { color: palette.danger }]}>{error}</Text> : null}
      {!error && hint ? (
        <Text style={[styles.support, { color: palette.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  label: { fontSize: 14, fontWeight: '700' },
  input: {
    fontSize: 16,
    minHeight: TouchTarget.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  support: { fontSize: 13, lineHeight: 18 },
});
