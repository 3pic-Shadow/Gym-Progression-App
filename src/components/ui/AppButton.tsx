import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from 'react-native';

import { Colors, Spacing, ThemeTokens, TouchTarget } from '@/constants/theme';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface AppButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  variant?: ButtonVariant;
  loading?: boolean;
}

export function AppButton({
  label,
  icon,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...props
}: AppButtonProps) {
  const colorScheme = useResolvedColorScheme();
  const palette = Colors[colorScheme];
  const tokens = ThemeTokens[colorScheme];
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const foreground = isPrimary
    ? palette.tintContrast
    : isDanger
      ? palette.danger
      : palette.text;
  const background = isPrimary
    ? palette.tint
    : variant === 'secondary'
      ? palette.surfaceMuted
      : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={(state) => [
        styles.button,
        { backgroundColor: background, borderColor: isDanger ? palette.danger : palette.border, borderRadius: tokens.buttonRadius, borderWidth: tokens.buttonBorderWidth },
        variant === 'ghost' && styles.ghost,
        state.pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon ? <MaterialIcons color={foreground} name={icon} size={20} /> : null}
          <Text style={[styles.label, { color: foreground }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    minHeight: TouchTarget.primary,
    paddingHorizontal: Spacing.md,
  },
  ghost: { borderColor: 'transparent' },
  label: { fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
});
