import { memo, useEffect, useRef, useState } from 'react';
import { EventBus } from '../../game/EventBus';

/**
 * GameNotification: displays a temporary message overlay.
 * Triggered via EventBus: GAME_NOTIFICATION with { text, duration? }
 * Shows centered text that fades in, holds, then fades out.
 */

// Add the event to GameEvent
// EventBus.emit('game:notification', { text: '...', duration: 3000 })

export const GameNotification = memo(function GameNotification() {
  const [notifications, setNotifications] = useState<Array<{ id: number; text: string; visible: boolean }>>([]);
  const nextIdRef = useRef(0);
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    const handler = (...args: unknown[]) => {
      const payload = args[0] as { text: string; duration?: number };
      const id = nextIdRef.current++;
      setNotifications((current) => [...current, { id, text: payload.text, visible: false }]);

      const fadeIn = window.requestAnimationFrame(() => {
        setNotifications((current) => current.map((item) => (item.id === id ? { ...item, visible: true } : item)));
      });

      const hold = payload.duration ?? 4000;
      const hideTimeout = window.setTimeout(() => {
        setNotifications((current) => current.map((item) => (item.id === id ? { ...item, visible: false } : item)));
      }, hold);
      const removeTimeout = window.setTimeout(() => {
        setNotifications((current) => current.filter((item) => item.id !== id));
      }, hold + 1000);

      timeoutsRef.current.push(fadeIn, hideTimeout, removeTimeout);
    };

    EventBus.on('game:notification', handler);
    return () => {
      EventBus.off('game:notification', handler);
      for (const timeout of timeoutsRef.current) {
        clearTimeout(timeout);
      }
    };
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div
      className="absolute left-0 right-0 flex flex-col items-center gap-2 pointer-events-none z-[110]"
      style={{ top: 40 }}
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="px-4 py-1 bg-stone-900/90 border border-amber-700/50 text-amber-300 text-center"
          style={{
            fontSize: '10px',
            opacity: notification.visible ? 1 : 0,
            transition: 'opacity 0.8s ease-in-out',
          }}
        >
          {notification.text}
        </div>
      ))}
    </div>
  );
});
