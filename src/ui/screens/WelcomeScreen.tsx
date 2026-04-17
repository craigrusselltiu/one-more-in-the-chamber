import { memo } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import type { Screen } from '../../App';

const CARD_SHADOW = '3px 3px 2px rgba(0,0,0,0.7)';
const BUTTON_SHADOW = '2px 2px 1px rgba(0,0,0,0.4)';

/**
 * First-visit gate. Shown when the user has no local player name AND no
 * authenticated session -- i.e. a brand-new visitor. Offers a choice between
 * logging in (goes to LoginScreen) or continuing as a guest (goes to main
 * menu, which will prompt for a display name).
 */
export const WelcomeScreen = memo(function WelcomeScreen() {
  const goLogin = () => EventBus.emit(GameEvent.SCREEN_CHANGE, 'login' satisfies Screen);
  const goGuest = () => EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);

  return (
    <div
      className="relative flex flex-col items-center justify-center h-full"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${import.meta.env.BASE_URL}assets/backgrounds/main_menu_bg.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <img
        src={`${import.meta.env.BASE_URL}assets/title.png`}
        alt="One More in the Chamber"
        className="mb-6"
        style={{ width: 320, imageRendering: 'auto' }}
        draggable={false}
      />

      <div
        className="rounded-sm p-5 flex flex-col gap-3 items-center text-center"
        style={{ width: 300, backgroundColor: 'rgba(28, 25, 23, 0.95)', boxShadow: CARD_SHADOW }}
      >
        <h2
          className="text-sm text-amber-400 font-bold uppercase"
          style={{ WebkitTextStroke: '3px #000', paintOrder: 'stroke fill', letterSpacing: '1px' }}
        >
          Welcome, Stranger
        </h2>
        <p className="text-[11px] text-stone-400 leading-snug">
          Sign in to save your progress across devices, or continue as a guest to play locally.
        </p>

        <div className="flex flex-col gap-2 w-full mt-1">
          <button
            onClick={goLogin}
            style={{ boxShadow: BUTTON_SHADOW, cursor: 'pointer' }}
            className="w-full px-4 py-1.5 text-[11px] rounded-sm bg-amber-800 text-amber-200 hover:bg-amber-700 active:translate-y-0.5 transition-transform"
          >
            Log In / Sign Up
          </button>
          <button
            onClick={goGuest}
            style={{ boxShadow: BUTTON_SHADOW, cursor: 'pointer' }}
            className="w-full px-4 py-1.5 text-[11px] rounded-sm bg-stone-800 text-stone-300 hover:bg-stone-700 active:translate-y-0.5 transition-transform"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
});
