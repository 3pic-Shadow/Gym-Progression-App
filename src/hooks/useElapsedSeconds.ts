import { useEffect, useState } from 'react';

export function useElapsedSeconds(startedAt: number | undefined) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    startedAt === undefined ? 0 : Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  );

  useEffect(() => {
    if (startedAt === undefined) {
      setElapsedSeconds(0);
      return;
    }

    const update = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };
    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [startedAt]);

  return elapsedSeconds;
}
