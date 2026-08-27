import { useEffect } from 'react';

import { usePlansStore, useSessionStore, useSettingsStore } from '@/src/store';

export function useAppHydration() {
  const plansHydrated = usePlansStore((state) => state.isHydrated);
  const sessionsHydrated = useSessionStore((state) => state.isHydrated);
  const settingsHydrated = useSettingsStore((state) => state.isHydrated);

  useEffect(() => {
    void Promise.all([
      usePlansStore.getState().hydrate(),
      useSessionStore.getState().hydrate(),
      useSettingsStore.getState().hydrate(),
    ]);
  }, []);

  return plansHydrated && sessionsHydrated && settingsHydrated;
}
