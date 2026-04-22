import { memo, useEffect, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { useMetaStore } from '../../store/metaStore';
import { checkForCombatResume } from '../../services/combatResume';
import { calculateScore } from '../../utils/scoring';
import { playHover } from '../../services/sfx';
import { getAuthState, subscribeAuth, type AuthState } from '../../services/auth';
import { Tooltip } from '../components/Tooltip';
import changelogRaw from '../../../CHANGELOG.md?raw';

import type { Screen } from '../../App';

function pickMainMenuMessage(playerName: string, isLoggedIn: boolean): { text: string; showGuestTag: boolean } {
  const displayName = playerName || 'Challenger';
  const messages = isLoggedIn
    ? [
        { text: `Welcome back, ${displayName}!`, showGuestTag: false },
        { text: 'Unlock new tiles in the Reputation Shop!', showGuestTag: false },
        { text: 'Check the Changelog to see what is new.', showGuestTag: false },
        { text: 'Visit the Ledger to review your discoveries.', showGuestTag: false },
      ]
    : [
        { text: `Welcome back, ${displayName}!`, showGuestTag: true },
        { text: 'Unlock new tiles in the Reputation Shop!', showGuestTag: true },
        { text: 'Check the Changelog to see what is new.', showGuestTag: true },
        { text: 'Visit the Ledger to review your discoveries.', showGuestTag: true },
      ];

  return messages[Math.floor(Math.random() * messages.length)];
}

function MenuButton({
  label,
  onClick,
  disabled,
  disabledTooltip,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Optional hover hint shown on the disabled state (e.g. a log-in prompt). */
  disabledTooltip?: string;
}) {
  if (disabled) {
    const body = (
      <div
        className="py-1 px-3 text-left"
        style={{
          fontSize: '14px',
          letterSpacing: '1px',
          color: '#5a3a3a',
          WebkitTextStroke: '3px #000',
          paintOrder: 'stroke fill',
          cursor: disabledTooltip ? 'help' : 'default',
        }}
      >
        {label}
      </div>
    );
    return disabledTooltip
      ? <Tooltip text={disabledTooltip} position="top">{body}</Tooltip>
      : body;
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={playHover}
      className="group relative text-left py-1 px-3 bg-transparent border-none outline-none"
      style={{
        fontSize: '14px',
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
  const [auth, setAuth] = useState<AuthState>(() => ({ ...getAuthState() }));
  const [mainMenuMessage] = useState(() => pickMainMenuMessage(playerName, auth.isLoggedIn));
  useEffect(() => subscribeAuth(setAuth), []);

  const handleNewGame = () => {

    if (hasActiveRun) {
      setShowConfirm(true);
    } else {
      EventBus.emit(GameEvent.SCREEN_CHANGE, 'character-select' satisfies Screen);
    }
  };

  const addReputation = useMetaStore((s) => s.addReputation);

  const handleConfirmNewGame = async () => {
    // Award reputation for the abandoned run (1 rep per 10 score, no minimum)
    if (run) {
      const finalScore = calculateScore(run);
      const rep = Math.floor(finalScore / 10);
      if (rep > 0) addReputation(rep);
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

    const currentRun = useRunStore.getState().run;
    const pendingEventResumeScreen = currentRun?.pendingEventResumeScreen;
    if (pendingEventResumeScreen) {
      EventBus.emit(GameEvent.SCREEN_CHANGE, pendingEventResumeScreen);
      return;
    }
    if (currentRun?.pendingCampfireOutcome) {
      EventBus.emit(GameEvent.SCREEN_CHANGE, 'campfire');
      return;
    }
    if (currentRun?.pendingLegendaryReward) {
      EventBus.emit(GameEvent.SCREEN_CHANGE, 'artifact');
      return;
    }

    // Check if player was at an incomplete node
    const currentNode = currentRun?.mapState?.nodes.find((n) => n.id === currentRun?.currentNodeId);
    if (currentNode && currentNode.visited && !currentNode.completed) {
      const screenMap: Record<string, Screen> = {
        merchant: 'merchant',
        campfire: 'campfire',
        event: 'event',
        artifact: 'artifact',
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

      // Unknown node type (corrupt save or old schema): mark completed so
      // the player isn't permanently stuck, then fall through to map.
      useRunStore.getState().markNodeCompleted(currentNode.id);
    }

    // Boss completed but act not yet advanced (quit between boss victory and tile pick)
    if (currentNode && currentNode.completed && currentNode.type === 'boss') {
      if (currentRun!.currentAct === 3) {
        EventBus.emit(GameEvent.SCREEN_CHANGE, 'score');
        useRunStore.getState().endRun(true);
        return;
      }
      // Reward already taken -> tile select; otherwise -> treasure
      EventBus.emit(GameEvent.SCREEN_CHANGE, currentRun!.bossRewardTaken ? 'tile-select' : 'artifact');
      return;
    }

    // Elite completed but reward not yet taken/skipped
    if (currentNode && currentNode.completed && currentNode.type === 'elite' && !currentRun!.eliteRewardTaken) {
      EventBus.emit(GameEvent.SCREEN_CHANGE, 'artifact');
      return;
    }

    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map');
  };

  const handleReputationShop = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'reputation-shop' satisfies Screen);
  };

  const handleCustomize = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'customize' satisfies Screen);
  };

  const handleLedger = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'ledger' satisfies Screen);
  };

  const handleLeaderboard = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'leaderboard' satisfies Screen);
  };

  const handleSettings = () => {

    EventBus.emit(GameEvent.SCREEN_CHANGE, 'settings' satisfies Screen);
  };

  const handleLogin = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'login' satisfies Screen);
  };

  return (
    <div
      className="relative"
      style={{
        width: 960,
        height: 540,
        backgroundImage: `url(${import.meta.env.BASE_URL}assets/backgrounds/main_menu_bg.png)`,
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

      {/* Welcome text -- just under the title image.
          Logged in: account display name.
          Guest with a local name: that name, with a dimmed "(Guest)" tag.
          Guest with no name yet: "Challenger" fallback (they'll be prompted
          for a name anyway by the modal below). */}
      {(auth.isLoggedIn ? playerName : true) && (
        <div className="absolute left-13 animate-welcome-breathe" style={{ top: 175, transformOrigin: 'left center' }}>
          <span
            style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.5)',
              WebkitTextStroke: '2px #000',
              paintOrder: 'stroke fill',
            }}
          >
            <>
              {mainMenuMessage.text}{' '}
              {mainMenuMessage.showGuestTag && (
                <span style={{ color: 'rgba(255,255,255,0.35)' }}>(Guest)</span>
              )}
            </>
          </span>
        </div>
      )}

      {/* Menu items -- bottom left */}
      <div className="absolute left-8 bottom-10 flex flex-col gap-0.5">
        {hasActiveRun && (
          <MenuButton label="Continue" onClick={handleContinue} />
        )}
        <MenuButton label="New Game" onClick={handleNewGame} />
        <MenuButton
          label="Reputation Shop"
          onClick={handleReputationShop}
          disabled={!auth.isLoggedIn}
          disabledTooltip={!auth.isLoggedIn ? 'Log in to spend reputation.' : undefined}
        />
        <MenuButton
          label="Customize"
          onClick={handleCustomize}
          disabled={!auth.isLoggedIn}
          disabledTooltip={!auth.isLoggedIn ? 'Log in to customize your look.' : undefined}
        />
        <MenuButton label="Ledger" onClick={handleLedger} />
        <MenuButton label="Leaderboard" onClick={handleLeaderboard} />
        <MenuButton label="Changelog" onClick={() => setShowChangelog(true)} />
        <MenuButton label="Settings" onClick={handleSettings} />
      </div>

      {/* Account indicator -- bottom right: shows login button when logged out,
          "signed in as" label when logged in. */}
      <div className="absolute right-2 bottom-4 text-right">
        {auth.isLoggedIn ? (
          <span
            style={{
              fontSize: '10px',
              color: 'rgba(231, 229, 228, 0.7)',
              WebkitTextStroke: '2px #000',
              paintOrder: 'stroke fill',
            }}
          >
            Signed In
          </span>
        ) : (
          <button
            onClick={handleLogin}
            onMouseEnter={playHover}
            style={{ boxShadow: '2px 2px 1px rgba(0,0,0,0.4)', cursor: 'pointer' }}
            className="px-4 py-1.5 text-[11px] rounded-sm bg-amber-800 text-amber-200 hover:bg-amber-700 active:translate-y-0.5 transition-transform"
          >
            Login
          </button>
        )}
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
          <div
            className="rounded-sm p-5 max-w-xs text-center"
            style={{ backgroundColor: 'rgba(28, 25, 23, 0.95)', boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
          >
            <p className="text-stone-300 text-xs mb-4 leading-snug">
              Starting a new game will delete your current saved run. Continue?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleConfirmNewGame}
                style={{ boxShadow: '2px 2px 1px rgba(0,0,0,0.4)', cursor: 'pointer' }}
                className="px-4 py-1.5 text-[11px] rounded-sm bg-red-900 text-red-200 hover:bg-red-800 active:translate-y-0.5 transition-transform"
              >
                Delete &amp; Start New
              </button>
              <button
                onClick={handleCancelNewGame}
                style={{ boxShadow: '2px 2px 1px rgba(0,0,0,0.4)', cursor: 'pointer' }}
                className="px-4 py-1.5 text-[11px] rounded-sm bg-stone-800 text-stone-300 hover:bg-stone-700 active:translate-y-0.5 transition-transform"
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

      {/* Name prompt -- shown once on first visit (guest mode only; signed-in users
          get their name from public.players via hydrateProfile). */}
      {!playerName && !auth.isLoggedIn && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div
            className="rounded-sm p-6 text-center"
            style={{ width: 300, backgroundColor: 'rgba(28, 25, 23, 0.95)', boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
          >
            <h2
              className="text-amber-400 text-sm font-bold uppercase mb-4"
              style={{ WebkitTextStroke: '3px #000', paintOrder: 'stroke fill', letterSpacing: '1px' }}
            >
              What is your name?
            </h2>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && nameInput.trim()) setPlayerName(nameInput.trim()); }}
              placeholder="Enter your name"
              maxLength={20}
              autoFocus
              className="w-full bg-stone-900/70 text-stone-100 text-sm px-3 py-2 rounded-sm outline-none text-center mb-4"
              style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' }}
            />
            <button
              onClick={() => { if (nameInput.trim()) setPlayerName(nameInput.trim()); }}
              disabled={!nameInput.trim()}
              style={{ boxShadow: nameInput.trim() ? '2px 2px 1px rgba(0,0,0,0.4)' : 'none', cursor: nameInput.trim() ? 'pointer' : 'not-allowed' }}
              className={`px-6 py-1.5 text-xs rounded-sm transition-transform ${
                nameInput.trim()
                  ? 'bg-amber-800 text-amber-200 hover:bg-amber-700 active:translate-y-0.5'
                  : 'bg-stone-800 text-stone-600 opacity-70'
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
