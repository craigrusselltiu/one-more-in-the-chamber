import { useState, useEffect } from 'react';

/**
 * Small indicator shown when the browser is offline.
 * Fades in/out on connectivity changes, auto-hides after going back online.
 */
export function OfflineIndicator() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [visible, setVisible] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => {
      setOffline(true);
      setVisible(true);
    };
    const goOnline = () => {
      setOffline(false);
      // Keep visible briefly so the user sees the transition
      setTimeout(() => setVisible(false), 2000);
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`
        fixed top-1 left-1/2 -translate-x-1/2 z-[9999]
        px-3 py-0.5 rounded text-[10px]
        transition-opacity duration-500 pointer-events-none
        ${offline
          ? 'bg-amber-900/90 text-amber-300 opacity-100'
          : 'bg-green-900/90 text-green-300 opacity-0'}
      `}
    >
      {offline ? 'OFFLINE' : 'ONLINE'}
    </div>
  );
}
