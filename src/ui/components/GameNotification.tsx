import { memo, useEffect, useState } from 'react';
import { EventBus } from '../../game/EventBus';

/**
 * GameNotification: displays a temporary message overlay.
 * Triggered via EventBus: GAME_NOTIFICATION with { text, duration? }
 * Shows centered text that fades in, holds, then fades out.
 */

// Add the event to GameEvent
// EventBus.emit('game:notification', { text: '...', duration: 3000 })

export const GameNotification = memo(function GameNotification() {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (...args: unknown[]) => {
      const payload = args[0] as { text: string; duration?: number };
      setMessage(payload.text);
      // Trigger fade-in on next frame so the transition fires
      requestAnimationFrame(() => setVisible(true));

      const hold = payload.duration ?? 3000;
      setTimeout(() => setVisible(false), hold);
      setTimeout(() => setMessage(null), hold + 800);
    };

    EventBus.on('game:notification', handler);
    return () => { EventBus.off('game:notification', handler); };
  }, []);

  if (!message) return null;

  return (
    <div
      className="absolute left-0 right-0 flex justify-center pointer-events-none z-40"
      style={{ top: 28 }}
    >
      <div
        className="px-6 py-2 bg-stone-900/90 border border-amber-700/50 font-mono text-amber-300 text-center"
        style={{
          fontSize: '11px',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.6s ease-in-out',
        }}
      >
        {message}
      </div>
    </div>
  );
});
