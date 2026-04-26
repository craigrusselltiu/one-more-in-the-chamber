import { memo, useEffect, useState } from 'react';
import { subscribeLoginSync } from '../../services/auth';
import { FullScreenOverlay } from './FullScreenOverlay';

/**
 * Blocking full-screen overlay shown during the post-login sync window
 * (syncOnLogin + hydrateProfile). Dark translucent backdrop with a centered
 * "Syncing data..." card so the user can't interact with the app until the
 * initial pull completes.
 */
export const LoginSyncOverlay = memo(function LoginSyncOverlay() {
  const [active, setActive] = useState(false);
  useEffect(() => subscribeLoginSync(setActive), []);

  if (!active) return null;

  return (
    <FullScreenOverlay zIndex={250} backdropClass="" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
      <div
        className="rounded-sm px-6 py-5 flex flex-col items-center gap-3"
        style={{ backgroundColor: 'rgba(28, 25, 23, 0.95)', boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-block rounded-full"
            style={{
              width: 8,
              height: 8,
              backgroundColor: '#fcd34d',
              animation: 'sync-pulse 0.9s ease-in-out infinite',
            }}
          />
          <h2
            className="text-sm text-amber-400 font-bold uppercase"
            style={{ WebkitTextStroke: '2px #000', paintOrder: 'stroke fill', letterSpacing: '1px' }}
          >
            Syncing data...
          </h2>
        </div>
        <p className="text-[10px] text-stone-400 text-center">
          Pulling your progress from the server.
        </p>
      </div>
    </FullScreenOverlay>
  );
});
