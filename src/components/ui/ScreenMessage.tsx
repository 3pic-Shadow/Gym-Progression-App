import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, ThemeTokens } from '@/constants/theme';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';

interface ScreenMessageProps {
  title: string;
  body?: string;
  error?: boolean;
}

export function ScreenMessage({ title, body, error }: ScreenMessageProps) {
  const colorScheme = useResolvedColorScheme();
  const palette = Colors[colorScheme];
  const tokens = ThemeTokens[colorScheme];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.surface, borderColor: error ? palette.danger : palette.border, borderRadius: tokens.radius, borderWidth: tokens.borderWidth },
      ]}>
      <MaterialIcons
        color={error ? palette.danger : palette.icon}
        name={error ? 'error-outline' : 'info-outline'}
        size={24}
      />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        {body ? <Text style={[styles.body, { color: palette.textMuted }]}>{body}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  copy: { flex: 1, gap: Spacing.xs },
  title: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
});
