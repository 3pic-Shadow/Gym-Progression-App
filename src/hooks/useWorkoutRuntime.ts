import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import {
  playRestCompletionSound,
  playRestCompletionVibration,
  prepareRestCompletionSound,
} from '@/src/services/feedback';
import { syncRestNotification } from '@/src/services/notifications';
import { useSessionStore, useSettingsStore } from '@/src/store';

const KEEP_AWAKE_TAG = 'gym-timer-active-workout';
const SOUND_LEAD_MILLISECONDS = 700;

export function useWorkoutRuntime() {
  const session = useSessionStore((state) => state.activeSession);
  const saveActiveSession = useSessionStore((state) => state.saveActiveSession);
  const settings = useSettingsStore((state) => state.settings);
  const completionInFlight = useRef(false);
  const shouldKeepAwake =
    settings.keepAwakeDuringWorkout &&
    Boolean(session && ['active', 'resting'].includes(session.status));

  useEffect(() => {
    if (shouldKeepAwake) {
      void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch((error) => {
        console.warn('Unable to keep the workout screen awake', error);
      });
    } else {
      void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    }

    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, [shouldKeepAwake]);

  useEffect(() => {
    if (session?.status === 'resting' && session.restEndsAt !== undefined) {
      if (settings.soundEnabled) {
        void prepareRestCompletionSound().catch((error) => {
          console.warn('Unable to prepare the rest completion sound', error);
        });
      }

      void syncRestNotification({
        enabled: settings.notificationEnabled,
        restEndsAt: session.restEndsAt,
        timing: settings.notificationTiming,
        title: settings.notificationTitle,
        message: settings.notificationMessage,
        soundEnabled: settings.soundEnabled,
        vibrationEnabled: settings.vibrationEnabled,
      });
      return;
    }

    void syncRestNotification(null);
  }, [
    session,
    settings.notificationEnabled,
    settings.notificationMessage,
    settings.notificationTiming,
    settings.notificationTitle,
    settings.soundEnabled,
    settings.vibrationEnabled,
  ]);

  useEffect(() => {
    if (session?.status !== 'resting' || session.restEndsAt === undefined) {
      completionInFlight.current = false;
      return;
    }

    const playScheduledSound = async () => {
      const currentSession = useSessionStore.getState().activeSession;
      const currentSettings = useSettingsStore.getState().settings;

      if (
        AppState.currentState === 'active' &&
        currentSettings.soundEnabled &&
        currentSession?.status === 'resting' &&
        currentSession.restEndsAt === session.restEndsAt &&
        Date.now() < session.restEndsAt!
      ) {
        await playRestCompletionSound(currentSettings.chimeTone, currentSettings.chimeVolume);
      }
    };

    const completeExpiredRest = async () => {
      const currentSession = useSessionStore.getState().activeSession;

      if (
        completionInFlight.current ||
        currentSession?.status !== 'resting' ||
        currentSession.restEndsAt === undefined ||
        currentSession.restEndsAt > Date.now()
      ) {
        return;
      }

      completionInFlight.current = true;
      try {
        const currentSettings = useSettingsStore.getState().settings;
        await Promise.all([
          useSessionStore.getState().finishRest(),
          currentSettings.vibrationEnabled
            ? playRestCompletionVibration(currentSettings.vibrationDurationMs)
            : Promise.resolve(),
        ]);
      } catch (error) {
        console.warn('Unable to finish the rest period', error);
      } finally {
        completionInFlight.current = false;
      }
    };

    const soundTimeout = setTimeout(
      () =>
        void playScheduledSound().catch((error) => {
          console.warn('Unable to play the rest completion sound', error);
        }),
      Math.max(0, session.restEndsAt - Date.now() - SOUND_LEAD_MILLISECONDS)
    );
    const timeout = setTimeout(
      () => void completeExpiredRest(),
      Math.max(0, session.restEndsAt - Date.now())
    );
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void completeExpiredRest();
      }
    });

    return () => {
      clearTimeout(soundTimeout);
      clearTimeout(timeout);
      subscription.remove();
    };
  }, [session?.restEndsAt, session?.status]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        const currentSession = useSessionStore.getState().activeSession;
        if (currentSession) {
          void saveActiveSession(currentSession).catch((error) => {
            console.warn('Unable to persist the active workout in the background', error);
          });
        }
      }
    });

    return () => subscription.remove();
  }, [saveActiveSession]);
}
