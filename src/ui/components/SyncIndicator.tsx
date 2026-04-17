import { memo, useEffect, useRef, useState } from 'react';
import { subscribeSync } from '../../services/syncService';

/** Grace period before showing the badge, so very short syncs don't flicker. */
const SHOW_AFTER_MS = 250;

/**
 * Small bottom-right badge that reads "Retrieving data..." while a long-running
 * sync is in flight (login pull, leaderboard fetch). Subscribes to the sync
 * pub/sub exposed by syncService.
 */
export const SyncIndicator = memo(function SyncIndicator() {
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return subscribeSync((active) => {
      if (active) {
        if (showTimer.current) return;
        showTimer.current = setTimeout(() => {
          setVisible(true);
          showTimer.current = null;
        }, SHOW_AFTER_MS);
      } else {
        if (showTimer.current) {
          clearTimeout(showTimer.current);
          showTimer.current = null;
        }
        setVisible(false);
      }
    });
  }, []);

  if (!visible) return null;

  return (
    <div
      className="absolute z-[150] pointer-events-none flex items-center gap-1.5"
      style={{
        right: 8,
        top: 8,
        padding: '3px 8px',
        fontSize: '10px',
        color: '#fcd34d',
        backgroundColor: 'rgba(28, 25, 23, 0.9)',
        borderRadius: 3,
        boxShadow: '2px 2px 1px rgba(0,0,0,0.4)',
        letterSpacing: '0.5px',
      }}
    >
      <span
        className="inline-block rounded-full"
        style={{
          width: 6,
          height: 6,
          backgroundColor: '#fcd34d',
          animation: 'sync-pulse 0.9s ease-in-out infinite',
        }}
      />
      Retrieving data...
    </div>
  );
});
