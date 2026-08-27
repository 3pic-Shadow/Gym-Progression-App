import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet } from 'react-native';

import { Colors, ThemeTokens, TouchTarget } from '@/constants/theme';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';

interface IconActionProps {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}

export function IconAction({ icon, label, onPress, disabled, danger }: IconActionProps) {
  const colorScheme = useResolvedColorScheme();
  const palette = Colors[colorScheme];
  const tokens = ThemeTokens[colorScheme];

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.surfaceMuted, borderColor: palette.border, borderRadius: tokens.buttonRadius, borderWidth: tokens.buttonBorderWidth },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <MaterialIcons color={danger ? palette.danger : palette.icon} name={icon} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    height: TouchTarget.minimum,
    justifyContent: 'center',
    width: TouchTarget.minimum,
  },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.32 },
});
