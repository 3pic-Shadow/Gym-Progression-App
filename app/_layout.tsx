import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { Colors, isDarkColorScheme, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useAppHydration } from '@/src/hooks/useAppHydration';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';
import { useWorkoutRuntime } from '@/src/hooks/useWorkoutRuntime';
import { ConfirmHost } from '@/src/components/ui/ConfirmHost';

export const unstable_settings = {
  anchor: '(tabs)',
};

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled application error', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorBody}>Your saved workout data has not been changed.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => this.setState({ hasError: false })}
            style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

function AppRoot() {
  const isHydrated = useAppHydration();
  const colorScheme = useResolvedColorScheme();
  useWorkoutRuntime();
  const palette = Colors[colorScheme];
  const navigationTheme = {
    ...(isDarkColorScheme(colorScheme) ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDarkColorScheme(colorScheme) ? DarkTheme.colors : DefaultTheme.colors),
      primary: palette.tint,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      notification: palette.danger,
    },
  };

  if (!isHydrated) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: palette.background }]}>
        <ActivityIndicator accessibilityLabel="Loading workout data" color={palette.tint} size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <ConfirmHost />
      <StatusBar style={isDarkColorScheme(colorScheme) ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <AppRoot />
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    flex: 1,
    gap: Spacing.md,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  errorTitle: {
    color: Colors.light.text,
    fontSize: 24,
    fontWeight: '700',
  },
  errorBody: {
    color: Colors.light.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: Colors.light.tint,
    borderRadius: Radius.md,
    justifyContent: 'center',
    minHeight: TouchTarget.primary,
    paddingHorizontal: Spacing.lg,
  },
  retryButtonText: {
    color: Colors.light.tintContrast,
    fontSize: 16,
    fontWeight: '700',
  },
});
