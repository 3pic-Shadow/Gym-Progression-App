import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';

interface FoundationScreenProps {
  title: string;
  children: ReactNode;
}

export function FoundationScreen({ title, children }: FoundationScreenProps) {
  const colorScheme = useResolvedColorScheme();
  const palette = Colors[colorScheme];

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>
        {title}
      </Text>
      <View
        style={[
          styles.content,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}>
        {children}
      </View>
    </View>
  );
}

export const foundationStyles = StyleSheet.create({
  primaryText: {
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryText: {
    fontSize: 15,
    lineHeight: 22,
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: Spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: Spacing.lg,
  },
  content: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    padding: Spacing.md,
  },
});
