import { memo, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { useMetaStore } from '../../store/metaStore';
import { checkForCombatResume } from '../../services/combatResume';
import { calculateScore } from '../../utils/scoring';
import { playHover } from '../../services/sfx';
import changelogRaw from '../../../CHANGELOG.md?raw';

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
          WebkitTextStroke: '3px #000',
          paintOrder: 'stroke fill',
        }}
      >
        {label}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={playHover}
      className="group relative text-left py-1 px-3 bg-transparent border-none outline-none"
      style={{
        fontSize: '18px',
        letterSpacing: '1px',
        color: '#e8e8e8',
        WebkitTextStroke: '3px #000',
        paintOrder: 'stroke fill',
        cursor: 'pointer',
      }}
    >
      {/* Hover highlight bar */}
      <span
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none rounded"
        style={{
          background:
            'linear-gradient(90deg, rgba(232,232,232,0.15) 0%, rgba(232,232,232,0.03) 70%, transparent 100%)',
        }}
      />
      {/* Text with shift animation */}
      <span className="relative inline-block transition-transform duration-150 group-hover:translate-x-1.5">
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
  const [showChangelog, setShowChangelog] = useState(false);
  const playerName = useMetaStore((s) => s.meta.playerName);
  const setPlayerName = useMetaStore((s) => s.setPlayerName);
  const [nameInput, setNameInput] = useState('');

  const handleNewGame = () => {

    if (hasActiveRun) {
      setShowConfirm(true);
    } else {
      EventBus.emit(GameEvent.SCREEN_CHANGE, 'character-select' satisfies Screen);
    }
  };

  const addReputation = useMetaStore((s) => s.addReputation);

  const handleConfirmNewGame = async () => {
    // Award reputation for the abandoned run
    if (run) {
      const finalScore = calculateScore(run);
      const rep = Math.max(10, Math.floor(finalScore / 10));
      addReputation(rep);
    }
    await clearRun();
    setShowConfirm(false);
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'character-select' satisfies Screen);
  };

  const handleCancelNewGame = () => {
    setShowConfirm(false);
  };

  const handleContinue = async () => {
    // Stop main menu music immediately (before async IndexedDB check)
    EventBus.emit(GameEvent.MUSIC_FADE_OUT);

    // Check for mid-combat save first -- if found, resume combat
    const hasCombatSave = await checkForCombatResume();
    if (hasCombatSave) {
      EventBus.emit(GameEvent.SCREEN_CHANGE, 'combat');
      return;
    }

    // Check if player was at an incomplete node
    const currentRun = useRunStore.getState().run;
    const currentNode = currentRun?.mapState?.nodes.find((n) => n.id === currentRun?.currentNodeId);
    if (currentNode && currentNode.visited && !currentNode.completed) {
      const screenMap: Record<string, Screen> = {
        shop: 'shop',
        rest: 'rest-site',
        event: 'event',
        treasure: 'treasure',
      };
      const screen = screenMap[currentNode.type];
      if (screen) {
        EventBus.emit(GameEvent.SCREEN_CHANGE, screen);
        return;
      }

      // Combat node visited but no snapshot: re-enter combat fresh
      const isCombatNode = currentNode.type === 'combat' || currentNode.type === 'elite' || currentNode.type === 'boss';
      if (isCombatNode) {
        EventBus.emit(GameEvent.SCREEN_CHANGE, 'combat');
        return;
      }
    }

    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map');
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
      {/* Title logo -- top left */}
      <img
        src={`${import.meta.env.BASE_URL}assets/title.png`}
        alt="One More in the Chamber"
        className="absolute left-11 top-6"
        style={{ width: 280, imageRendering: 'auto' }}
        draggable={false}
      />

      {/* Welcome text -- just under the title image */}
      {playerName && (
        <div className="absolute left-13 animate-welcome-breathe" style={{ top: 175, transformOrigin: 'left center' }}>
          <span
            style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.5)',
              WebkitTextStroke: '2px #000',
              paintOrder: 'stroke fill',
            }}
          >
            Welcome back, {playerName}!
          </span>
        </div>
      )}

      {/* Menu items -- bottom left */}
      <div className="absolute left-8 bottom-10 flex flex-col gap-0.5">
        {hasActiveRun && (
          <MenuButton label="Continue" onClick={handleContinue} />
        )}
        <MenuButton label="New Game" onClick={handleNewGame} />
        <MenuButton label="Reputation Shop" disabled />
        <MenuButton label="Leaderboard" onClick={handleLeaderboard} />
        <MenuButton label="Changelog" onClick={() => setShowChangelog(true)} />
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


      {/* Changelog popup */}
      {showChangelog && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/80 z-10"
          onClick={(e) => { if (e.target === e.currentTarget) setShowChangelog(false); }}
        >
          <div className="border border-stone-600 bg-stone-900 p-5 flex flex-col" style={{ width: 500, maxHeight: 440 }}>
            <h2 className="text-amber-400 text-sm font-bold mb-3 text-center">Changelog</h2>
            <div className="overflow-y-auto flex-1 pr-2 text-xs" style={{ scrollbarWidth: 'thin' }}>
              {changelogRaw
                .split('\n')
                .filter((_, i) => i > 4) // skip title + preamble
                .map((line, i) => {
                  if (line.startsWith('## '))
                    return <h3 key={i} className="text-amber-400 font-bold mt-3 mb-1" style={{ fontSize: '13px' }}>{line.slice(3)}</h3>;
                  if (line.startsWith('### '))
                    return <h4 key={i} className="text-stone-400 font-bold mt-2 mb-0.5">{line.slice(4)}</h4>;
                  if (line.startsWith('- '))
                    return <p key={i} className="text-stone-300 ml-3 leading-relaxed">{'- '}{line.slice(2)}</p>;
                  return null;
                })}
            </div>
            <button
              onClick={() => setShowChangelog(false)}
              className="mt-3 px-6 py-1.5 text-xs bg-stone-700/50 text-stone-300 border border-stone-600 hover:bg-stone-600/50 self-center"
              style={{ cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Name prompt -- shown once on first visit */}
      {!playerName && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="border border-stone-600 bg-stone-900 p-6 text-center" style={{ width: 280 }}>
            <h2 className="text-amber-400 text-sm font-bold mb-3">What is your name?</h2>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && nameInput.trim()) setPlayerName(nameInput.trim()); }}
              placeholder="Enter your name"
              maxLength={20}
              autoFocus
              className="w-full bg-stone-800/60 border border-stone-600 text-stone-200 text-sm px-3 py-2 outline-none focus:border-amber-600 text-center mb-3"
            />
            <button
              onClick={() => { if (nameInput.trim()) setPlayerName(nameInput.trim()); }}
              disabled={!nameInput.trim()}
              className={`px-6 py-1.5 text-xs border ${
                nameInput.trim()
                  ? 'bg-amber-900/60 text-amber-300 border-amber-700 hover:bg-amber-800/60'
                  : 'bg-stone-700/50 text-stone-500 border-stone-600 cursor-not-allowed'
              }`}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
