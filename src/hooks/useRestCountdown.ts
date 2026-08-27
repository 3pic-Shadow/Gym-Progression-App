import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getRemainingSeconds } from '@/src/services/timer';

export function useRestCountdown(restEndsAt: number | undefined) {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    restEndsAt === undefined ? 0 : getRemainingSeconds(restEndsAt)
  );
  useEffect(() => {
    if (restEndsAt === undefined) {
      setRemainingSeconds(0);
      return;
    }

    const updateRemainingTime = () => {
      const remaining = getRemainingSeconds(restEndsAt);
      setRemainingSeconds(remaining);
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 250);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        updateRemainingTime();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [restEndsAt]);

  return remainingSeconds;
}
