import { memo } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import type { Screen } from '../../App';

const MENU_FONT = 'monospace';

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
          fontFamily: MENU_FONT,
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
        fontFamily: MENU_FONT,
        fontSize: '18px',
        letterSpacing: '1px',
        color: '#e88888',
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
            'linear-gradient(90deg, rgba(232,136,136,0.25) 0%, rgba(232,136,136,0.05) 70%, transparent 100%)',
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
  const hasActiveRun = run && run.status === 'active';

  const handleNewGame = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'tile-select' satisfies Screen);
  };

  const handleContinue = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  const handleReputationShop = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'reputation-shop' satisfies Screen);
  };

  const handleLeaderboard = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'leaderboard' satisfies Screen);
  };

  return (
    <div
      className="relative"
      style={{
        width: 960,
        height: 540,
        backgroundImage: 'url(/assets/main_menu_bg.png)',
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
        <MenuButton label="Settings" disabled />
      </div>

      {/* Version -- bottom right */}
      <div className="absolute right-4 bottom-3">
        <span
          style={{
            fontFamily: MENU_FONT,
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
