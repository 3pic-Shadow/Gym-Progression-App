import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';

interface AppScreenProps extends ScrollViewProps {
  children: ReactNode;
  footer?: ReactNode;
  includeTopInset?: boolean;
}

export function AppScreen({
  children,
  footer,
  includeTopInset = false,
  contentContainerStyle,
  ...props
}: AppScreenProps) {
  const palette = Colors[useResolvedColorScheme()];
  const insets = useSafeAreaInsets();
  const contentBottomPadding = Math.max(Spacing.xl, insets.bottom + Spacing.md);
  const footerBottomPadding = Math.max(Spacing.md, insets.bottom + Spacing.sm);
  const contentTopPadding = includeTopInset ? insets.top + Spacing.md : Spacing.md;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.flex, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          contentContainerStyle,
          { paddingBottom: contentBottomPadding, paddingTop: contentTopPadding },
        ]}
        keyboardShouldPersistTaps="handled"
        style={styles.flex}
        {...props}>
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: palette.surface,
              borderTopColor: palette.border,
              paddingBottom: footerBottomPadding,
            },
          ]}>
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    gap: Spacing.md,
    padding: Spacing.md,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
  },
});
