import * as Haptics from 'expo-haptics';
import type { AudioPlayer } from 'expo-audio';
import { Platform, Vibration } from 'react-native';

import type { ChimeTone } from '@/src/models';

const REST_CHIME =
  'data:audio/wav;base64,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';

let chimePlayer: AudioPlayer | null = null;
let chimePreparation: Promise<void> | null = null;

const CHIME_PLAYBACK_RATES: Record<ChimeTone, number> = {
  classic: 1,
  bright: 1.25,
  deep: 0.8,
};

export function prepareRestCompletionSound() {
  if (chimePlayer) {
    return Promise.resolve();
  }
  if (chimePreparation) {
    return chimePreparation;
  }

  chimePreparation = (async () => {
    const { createAudioPlayer, setAudioModeAsync } = await import('expo-audio');

    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    });

    chimePlayer = createAudioPlayer(REST_CHIME);
  })().finally(() => {
    chimePreparation = null;
  });

  return chimePreparation;
}

export async function playRestCompletionSound(tone: ChimeTone, volume: number) {
  await prepareRestCompletionSound();

  if (!chimePlayer) {
    return;
  }

  chimePlayer.volume = Math.min(1, Math.max(0, volume));
  chimePlayer.shouldCorrectPitch = false;
  chimePlayer.setPlaybackRate(CHIME_PLAYBACK_RATES[tone]);
  await chimePlayer.seekTo(0);
  chimePlayer.play();
}

export async function playRestCompletionVibration(durationMs: number) {
  if (Platform.OS === 'android') {
    Vibration.vibrate(durationMs);
    return;
  }
  if (Platform.OS === 'ios') {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}
