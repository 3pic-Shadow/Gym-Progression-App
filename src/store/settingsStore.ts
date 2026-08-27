import { create } from 'zustand';

import { DEFAULT_SETTINGS } from '@/src/constants/defaults';
import { STORAGE_KEYS } from '@/src/constants/storage';
import type { AppSettings } from '@/src/models';
import { loadValidated, saveValidated } from '@/src/services/persistence';
import { appSettingsSchema } from '@/src/validation';

import { getErrorMessage } from './storeUtils';

interface SettingsState {
  settings: AppSettings;
  isHydrated: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  replaceSettings: (settings: AppSettings) => Promise<void>;
}

let lastPersistedSettings = DEFAULT_SETTINGS;
let settingsWriteQueue: Promise<void> = Promise.resolve();

function persistSettings(settings: AppSettings) {
  const write = settingsWriteQueue
    .catch(() => undefined)
    .then(async () => {
      await saveValidated(STORAGE_KEYS.settings, settings, appSettingsSchema);
      lastPersistedSettings = settings;
    });

  settingsWriteQueue = write;
  return write;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isHydrated: false,
  error: null,

  hydrate: async () => {
    const result = await loadValidated(STORAGE_KEYS.settings, appSettingsSchema);

    if (result.status === 'loaded') {
      lastPersistedSettings = result.data;
      set({ settings: result.data, isHydrated: true, error: null });
      return;
    }

    if (result.status === 'empty') {
      try {
        await persistSettings(DEFAULT_SETTINGS);
        set({ settings: DEFAULT_SETTINGS, isHydrated: true, error: null });
      } catch (error) {
        set({ settings: DEFAULT_SETTINGS, isHydrated: true, error: getErrorMessage(error) });
      }
      return;
    }

    set({
      settings: DEFAULT_SETTINGS,
      isHydrated: true,
      error: 'Saved settings could not be loaded. ' + result.error,
    });
  },

  updateSettings: async (updates) => {
    const settings = appSettingsSchema.parse({ ...get().settings, ...updates });
    set({ settings, error: null });

    try {
      await persistSettings(settings);
    } catch (error) {
      const message = getErrorMessage(error);
      set((state) => ({
        settings: state.settings === settings ? lastPersistedSettings : state.settings,
        error: message,
      }));
      throw error;
    }
  },

  resetSettings: async () => {
    set({ settings: DEFAULT_SETTINGS, error: null });

    try {
      await persistSettings(DEFAULT_SETTINGS);
    } catch (error) {
      const message = getErrorMessage(error);
      set((state) => ({
        settings:
          state.settings === DEFAULT_SETTINGS ? lastPersistedSettings : state.settings,
        error: message,
      }));
      throw error;
    }
  },

  replaceSettings: async (settings) => {
    const validatedSettings = appSettingsSchema.parse(settings);
    set({ settings: validatedSettings, error: null });
    try {
      await persistSettings(validatedSettings);
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message });
      throw error;
    }
  },
}));
