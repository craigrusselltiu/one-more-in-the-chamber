import { memo, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useSettingsStore } from '../../store/settingsStore';
import { useMetaStore } from '../../store/metaStore';
import { useAuthStore } from '../../store/authStore';
import { logout } from '../../services/auth';
import type { GameSpeed } from '../../store/settingsStore';
import type { Screen } from '../../App';


function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-3 px-4 bg-transparent border-none outline-none text-left group"
      style={{ cursor: 'pointer' }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-stone-200">{label}</span>
        <span className="text-xs text-stone-500">{description}</span>
      </div>
      <div
        className="relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ml-4"
        style={{
          backgroundColor: checked ? '#b45309' : '#44403c',
        }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200"
          style={{
            backgroundColor: checked ? '#fbbf24' : '#78716c',
            transform: checked ? 'translateX(22px)' : 'translateX(2px)',
          }}
        />
      </div>
    </button>
  );
}

function SpeedSelector({
  value,
  onChange,
}: {
  value: GameSpeed;
  onChange: (speed: GameSpeed) => void;
}) {
  const speeds: GameSpeed[] = [1, 2, 3];
  return (
    <div className="flex items-center justify-between w-full py-3 px-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-stone-200">Game Speed</span>
        <span className="text-xs text-stone-500">Animation speed multiplier</span>
      </div>
      <div className="flex gap-1">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className="w-8 h-6 flex items-center justify-center text-xs border"
            style={{
              backgroundColor: value === s ? 'rgba(180, 83, 9, 0.6)' : 'rgba(28, 25, 23, 0.6)',
              borderColor: value === s ? '#b45309' : '#44403c',
              color: value === s ? '#fbbf24' : '#78716c',
              cursor: 'pointer',
            }}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}

function VolumeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (volume: number) => void;
}) {
  return (
    <div className="flex items-center justify-between w-full py-3 px-4">
      <div className="flex flex-col gap-0.5" style={{ minWidth: 120 }}>
        <span className="text-sm text-stone-200">{label}</span>
        <span className="text-xs text-stone-500" style={{ minWidth: 32 }}>{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-24 h-1 accent-amber-600 cursor-pointer"
      />
    </div>
  );
}

export const SettingsScreen = memo(function SettingsScreen() {
  const screenShakeEnabled = useSettingsStore((s) => s.screenShakeEnabled);
  const juiceAnimationsEnabled = useSettingsStore((s) => s.juiceAnimationsEnabled);
  const gameSpeed = useSettingsStore((s) => s.gameSpeed);
  const musicVolume = useSettingsStore((s) => s.musicVolume);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const setScreenShake = useSettingsStore((s) => s.setScreenShake);
  const setJuiceAnimations = useSettingsStore((s) => s.setJuiceAnimations);
  const setGameSpeed = useSettingsStore((s) => s.setGameSpeed);
  const setMusicVolume = useSettingsStore((s) => s.setMusicVolume);
  const setSfxVolume = useSettingsStore((s) => s.setSfxVolume);

  const playerName = useMetaStore((s) => s.meta.playerName);
  const setPlayerName = useMetaStore((s) => s.setPlayerName);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(playerName);

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const authDisplayName = useAuthStore((s) => s.displayName);

  const handleLogout = async () => {
    await logout();
  };

  const handleSignIn = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'auth' satisfies Screen);
  };

  const confirmName = () => {
    if (nameInput.trim()) {
      setPlayerName(nameInput.trim());
    } else {
      setNameInput(playerName);
    }
    setEditingName(false);
  };

  const handleBack = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  return (
    <div className="flex flex-col items-center h-full bg-[#1a1a2e]/95">
      {/* Header */}
      <div className="mt-6 mb-4 text-center">
        <h2
          className="text-xl text-amber-400"
          style={{ letterSpacing: '1px' }}
        >
          Settings
        </h2>
      </div>

      {/* Settings list */}
      <div className="w-full max-w-[400px] px-4">
        <div className="border border-stone-700 bg-stone-800/30 divide-y divide-stone-700/50">
          {/* Change Name */}
          <div className="flex items-center justify-between w-full py-3 px-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm text-stone-200">Name</span>
              <span className="text-xs text-stone-500">Your display name</span>
            </div>
            {editingName ? (
              <div className="flex gap-1 items-center ml-4">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmName(); if (e.key === 'Escape') { setNameInput(playerName); setEditingName(false); } }}
                  maxLength={20}
                  autoFocus
                  className="w-28 bg-stone-800/60 border border-stone-600 text-stone-200 text-xs px-2 py-1 outline-none focus:border-amber-600"
                />
                <button
                  onClick={confirmName}
                  className="px-2 py-1 text-xs border border-amber-700 bg-amber-900/60 text-amber-300 hover:bg-amber-800/60"
                  style={{ cursor: 'pointer' }}
                >
                  OK
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setNameInput(playerName); setEditingName(true); }}
                className="text-xs text-red-400 px-2 py-1 border border-stone-600 bg-stone-700/40 hover:bg-stone-600/40 ml-4"
                style={{ cursor: 'pointer' }}
              >
                Change
              </button>
            )}
          </div>

          <VolumeSlider label="Music Volume" value={musicVolume} onChange={setMusicVolume} />
          <VolumeSlider label="SFX Volume" value={sfxVolume} onChange={setSfxVolume} />
          <SpeedSelector value={gameSpeed} onChange={setGameSpeed} />
          <Toggle
            label="Screen Shake"
            description="Camera shake on big hits and cascades"
            checked={screenShakeEnabled}
            onChange={setScreenShake}
          />
          <Toggle
            label="Juice Animations"
            description="Tile pop, bounce, particles, and flash effects"
            checked={juiceAnimationsEnabled}
            onChange={setJuiceAnimations}
          />
        </div>
      </div>

      {/* Account section */}
      <div className="w-full max-w-[400px] px-4 mt-4">
        <h3 className="text-xs text-stone-500 uppercase tracking-widest mb-1 px-1">Account</h3>
        <div className="border border-stone-700 bg-stone-800/30">
          {isLoggedIn ? (
            <div className="flex items-center justify-between w-full py-3 px-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-stone-200">Signed in</span>
                <span className="text-xs text-stone-500">{authDisplayName ?? 'Unknown'}</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs text-red-400 px-2 py-1 border border-stone-600 bg-stone-700/40 hover:bg-red-900/30 ml-4"
                style={{ cursor: 'pointer' }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full py-3 px-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-stone-200">Not signed in</span>
                <span className="text-xs text-stone-500">Sign in to sync progress</span>
              </div>
              <button
                onClick={handleSignIn}
                className="text-xs text-amber-400 px-2 py-1 border border-amber-700 bg-amber-900/40 hover:bg-amber-800/40 ml-4"
                style={{ cursor: 'pointer' }}
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Back button */}
      <div className="py-3">
        <button
          onClick={handleBack}
          className="px-6 py-2 bg-stone-700/50 text-stone-300 text-sm border border-stone-600 hover:bg-stone-600/50"
          style={{ cursor: 'pointer' }}
        >
          Back
        </button>
      </div>
    </div>
  );
});

/**
 * In-combat settings popup. Shown when clicking [=] in the top bar.
 * Contains game speed, volume, and give up button.
 */
export const CombatSettingsPopup = memo(function CombatSettingsPopup({
  onClose,
  onGiveUp,
  onMainMenu,
}: {
  onClose: () => void;
  onMainMenu: () => void;
  onGiveUp: () => void;
}) {
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const gameSpeed = useSettingsStore((s) => s.gameSpeed);
  const musicVolume = useSettingsStore((s) => s.musicVolume);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const screenShakeEnabled = useSettingsStore((s) => s.screenShakeEnabled);
  const juiceAnimationsEnabled = useSettingsStore((s) => s.juiceAnimationsEnabled);
  const setGameSpeed = useSettingsStore((s) => s.setGameSpeed);
  const setMusicVolume = useSettingsStore((s) => s.setMusicVolume);
  const setSfxVolume = useSettingsStore((s) => s.setSfxVolume);
  const setScreenShake = useSettingsStore((s) => s.setScreenShake);
  const setJuiceAnimations = useSettingsStore((s) => s.setJuiceAnimations);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-black/60 z-50 pointer-events-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-64 border border-stone-600 bg-stone-900 p-4">
        <h3 className="text-amber-400 text-sm font-bold text-center mb-3">Settings</h3>

        <div className="flex flex-col gap-2 text-[9px]">
          {/* Music Volume */}
          <div className="flex items-center gap-2">
            <span className="text-stone-300" style={{ width: 40 }}>Music</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(musicVolume * 100)}
              onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
              className="flex-1 h-1 accent-amber-600 cursor-pointer"
            />
            <span className="text-stone-500 text-right" style={{ width: 28 }}>{Math.round(musicVolume * 100)}%</span>
          </div>

          {/* SFX Volume */}
          <div className="flex items-center gap-2">
            <span className="text-stone-300" style={{ width: 40 }}>SFX</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(sfxVolume * 100)}
              onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
              className="flex-1 h-1 accent-amber-600 cursor-pointer"
            />
            <span className="text-stone-500 text-right" style={{ width: 28 }}>{Math.round(sfxVolume * 100)}%</span>
          </div>

          {/* Game Speed */}
          <div className="flex items-center justify-between">
            <span className="text-stone-300">Speed</span>
            <div className="flex gap-1">
              {([1, 2, 3] as GameSpeed[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setGameSpeed(s)}
                  className="w-7 h-5 flex items-center justify-center border"
                  style={{
                    backgroundColor: gameSpeed === s ? 'rgba(180, 83, 9, 0.6)' : 'rgba(28, 25, 23, 0.6)',
                    borderColor: gameSpeed === s ? '#b45309' : '#44403c',
                    color: gameSpeed === s ? '#fbbf24' : '#78716c',
                    fontSize: '9px',
                    cursor: 'pointer',
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center justify-between">
            <span className="text-stone-300">Screen Shake</span>
            <button
              onClick={() => setScreenShake(!screenShakeEnabled)}
              className="text-[9px] px-2 py-0.5 border"
              style={{
                backgroundColor: screenShakeEnabled ? 'rgba(180, 83, 9, 0.4)' : 'rgba(28, 25, 23, 0.4)',
                borderColor: screenShakeEnabled ? '#b45309' : '#44403c',
                color: screenShakeEnabled ? '#fbbf24' : '#78716c',
                cursor: 'pointer',
              }}
            >
              {screenShakeEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-stone-300">Animations</span>
            <button
              onClick={() => setJuiceAnimations(!juiceAnimationsEnabled)}
              className="text-[9px] px-2 py-0.5 border"
              style={{
                backgroundColor: juiceAnimationsEnabled ? 'rgba(180, 83, 9, 0.4)' : 'rgba(28, 25, 23, 0.4)',
                borderColor: juiceAnimationsEnabled ? '#b45309' : '#44403c',
                color: juiceAnimationsEnabled ? '#fbbf24' : '#78716c',
                cursor: 'pointer',
              }}
            >
              {juiceAnimationsEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Divider + Main Menu / Give Up */}
        <div className="border-t border-stone-700 mt-3 pt-3 flex flex-col gap-2">
          <button
            onClick={onMainMenu}
            className="w-full py-1.5 text-stone-300 hover:bg-stone-700/50 border border-stone-600 text-[10px]"
            style={{ cursor: 'pointer' }}
          >
            Main Menu
          </button>
          {!confirmGiveUp ? (
            <button
              onClick={() => setConfirmGiveUp(true)}
              className="w-full py-1.5 text-red-400 hover:bg-red-900/30 border border-red-900/50 text-[10px]"
              style={{ cursor: 'pointer' }}
            >
              Give Up
            </button>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-stone-300 text-center" style={{ fontSize: '9px' }}>End this run?</p>
              <div className="flex gap-1">
                <button
                  onClick={onGiveUp}
                  className="flex-1 py-1.5 text-red-400 hover:bg-red-900/30 border border-red-900/50 text-[10px]"
                  style={{ cursor: 'pointer' }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmGiveUp(false)}
                  className="flex-1 py-1.5 text-stone-400 hover:bg-stone-700/50 border border-stone-600 text-[10px]"
                  style={{ cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-full py-1.5 text-stone-400 hover:bg-stone-800 border border-stone-700 text-[10px]"
            style={{ cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
});
