import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ThemePreference } from '@/src/models';
import { useSettingsStore } from '@/src/store';

export function useResolvedColorScheme() {
  const systemColorScheme = useColorScheme();
  const themePreference = useSettingsStore((state) => state.settings.theme);

  return (themePreference === 'system' ? (systemColorScheme ?? 'light') : themePreference) as Exclude<
    ThemePreference,
    'system'
  >;
}
