import { memo, useEffect, useState } from 'react';
import { subscribeKicked } from '../../services/kickout';
import { logout } from '../../services/auth';
import { FullScreenOverlay } from './FullScreenOverlay';

/**
 * Blocking full-screen overlay shown when another browser tab / device has
 * taken over the player's active run. Offers a single action: sign out and
 * return to the main menu.
 */
export const KickoutOverlay = memo(function KickoutOverlay() {
  const [kicked, setKicked] = useState(false);
  useEffect(() => subscribeKicked(setKicked), []);

  if (!kicked) return null;

  const handleReturn = () => {
    logout().catch(console.error);
  };

  return (
    <FullScreenOverlay zIndex={260} backdropClass="" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
      <div
        className="rounded-sm px-6 py-5 max-w-sm text-center flex flex-col items-center gap-3"
        style={{ backgroundColor: 'rgba(28, 25, 23, 0.95)', boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
      >
        <h2
          className="text-sm text-amber-400 font-bold uppercase"
          style={{ WebkitTextStroke: '3px #000', paintOrder: 'stroke fill', letterSpacing: '1px' }}
        >
          Signed In Elsewhere
        </h2>
        <p className="text-[11px] text-stone-300 leading-snug">
          Your account was signed in on another device. Only one active session is allowed.
          You've been signed out here.
        </p>
        <button
          onClick={handleReturn}
          style={{ boxShadow: '2px 2px 1px rgba(0,0,0,0.4)', cursor: 'pointer' }}
          className="px-5 py-1.5 text-[11px] rounded-sm bg-amber-800 text-amber-200 hover:bg-amber-700 active:translate-y-0.5 transition-transform"
        >
          Back to Main Menu
        </button>
      </div>
    </FullScreenOverlay>
  );
});
