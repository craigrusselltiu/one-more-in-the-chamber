import { memo, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { checkForCombatResume } from '../../services/combatResume';

import type { Screen } from '../../App';


function MenuButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div
        className="py-1 px-3 text-left"
        style={{
                    fontSize: '18px',
          letterSpacing: '1px',
          color: '#5a3a3a',
          textShadow:
            '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 4px rgba(0,0,0,0.5)',
        }}
      >
        {label}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group relative text-left py-1 px-3 bg-transparent border-none outline-none"
      style={{
                fontSize: '18px',
        letterSpacing: '1px',
        color: '#e8e8e8',
        textShadow:
          '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 4px rgba(0,0,0,0.5)',
        cursor: 'pointer',
      }}
    >
      {/* Hover highlight bar */}
      <span
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded"
        style={{
          background:
            'linear-gradient(90deg, rgba(232,232,232,0.15) 0%, rgba(232,232,232,0.03) 70%, transparent 100%)',
        }}
      />
      {/* Text with shift animation */}
      <span className="relative inline-block transition-transform duration-300 group-hover:translate-x-1.5">
        {label}
      </span>
    </button>
  );
}

export const MainMenu = memo(function MainMenu() {
  const run = useRunStore((s) => s.run);
  const clearRun = useRunStore((s) => s.clearRun);
  const hasActiveRun = run && run.status === 'active';
  const [showConfirm, setShowConfirm] = useState(false);

  const handleNewGame = () => {

    if (hasActiveRun) {
      setShowConfirm(true);
    } else {
      EventBus.emit(GameEvent.SCREEN_CHANGE, 'character-select' satisfies Screen);
    }
  };

  const handleConfirmNewGame = async () => {

    await clearRun();
    setShowConfirm(false);
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'character-select' satisfies Screen);
  };

  const handleCancelNewGame = () => {
    setShowConfirm(false);
  };

  const handleContinue = async () => {

    // Check for mid-combat save first -- if found, resume combat
    const hasCombatSave = await checkForCombatResume();
    EventBus.emit(GameEvent.SCREEN_CHANGE, hasCombatSave ? 'combat' : 'map');
  };

  const handleReputationShop = () => {

    EventBus.emit(GameEvent.SCREEN_CHANGE, 'reputation-shop' satisfies Screen);
  };

  const handleLeaderboard = () => {

    EventBus.emit(GameEvent.SCREEN_CHANGE, 'leaderboard' satisfies Screen);
  };

  const handleSettings = () => {

    EventBus.emit(GameEvent.SCREEN_CHANGE, 'settings' satisfies Screen);
  };

  return (
    <div
      className="relative"
      style={{
        width: 960,
        height: 540,
        backgroundImage: `url(${import.meta.env.BASE_URL}assets/main_menu_bg.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Menu items -- bottom left */}
      <div className="absolute left-8 bottom-10 flex flex-col gap-0.5">
        {hasActiveRun && (
          <MenuButton label="Continue" onClick={handleContinue} />
        )}
        <MenuButton label="New Game" onClick={handleNewGame} />
        <MenuButton label="Reputation Shop" onClick={handleReputationShop} />
        <MenuButton label="Leaderboard" onClick={handleLeaderboard} />
        <MenuButton label="Settings" onClick={handleSettings} />
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
          <div className="border border-stone-600 bg-stone-900 p-6 max-w-xs text-center">
            <p className="text-stone-300 text-sm mb-4">
              Starting a new game will delete your current saved run. Continue?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleConfirmNewGame}
                className="px-4 py-1.5 text-xs bg-red-900/60 text-red-300 border border-red-700 hover:bg-red-800/60"
              >
                Delete & Start New
              </button>
              <button
                onClick={handleCancelNewGame}
                className="px-4 py-1.5 text-xs bg-stone-800/60 text-stone-300 border border-stone-600 hover:bg-stone-700/60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version -- bottom right */}
      <div className="absolute right-4 bottom-3">
        <span
          style={{
                        fontSize: '9px',
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          v0.1.0
        </span>
      </div>
    </div>
  );
});
