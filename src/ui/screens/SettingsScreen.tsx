import { memo, useEffect, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useSettingsStore } from '../../store/settingsStore';
import { useMetaStore } from '../../store/metaStore';
import { getAuthState, subscribeAuth, logout, type AuthState } from '../../services/auth';
import { updateDisplayName, validateDisplayName, checkDisplayNameAvailable, DISPLAY_NAME_MAX } from '../../services/players';
import type { GameSpeed } from '../../store/settingsStore';
import type { Screen } from '../../App';


/** Shared row shell: compact label/description + trailing control. */
function SettingRow({
  label,
  description,
  control,
  onClick,
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
  onClick?: () => void;
}) {
  const Wrapper: 'button' | 'div' = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className="flex items-center justify-between w-full py-1 px-2.5 bg-transparent border-none outline-none text-left"
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className="flex flex-col gap-px min-w-0">
        <span className="text-xs text-stone-200">{label}</span>
        {description && <span className="text-[9px] text-stone-500 leading-tight">{description}</span>}
      </div>
      <div className="ml-3 flex-shrink-0">{control}</div>
    </Wrapper>
  );
}

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
    <SettingRow
      label={label}
      description={description}
      onClick={() => onChange(!checked)}
      control={
        <div
          className="relative rounded-full transition-colors duration-200"
          style={{
            width: 32,
            height: 16,
            backgroundColor: checked ? '#b45309' : '#44403c',
          }}
        >
          <div
            className="absolute top-0.5 rounded-full transition-transform duration-200"
            style={{
              width: 12,
              height: 12,
              backgroundColor: checked ? '#fbbf24' : '#78716c',
              transform: checked ? 'translateX(18px)' : 'translateX(2px)',
            }}
          />
        </div>
      }
    />
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
    <SettingRow
      label="Game Speed"
      description="Animation speed multiplier"
      control={
        <div className="flex gap-0.5">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onChange(s)}
              className="flex items-center justify-center rounded-sm transition-transform active:translate-y-px"
              style={{
                width: 22,
                height: 20,
                fontSize: '10px',
                backgroundColor: value === s ? 'rgba(120, 53, 15, 0.85)' : 'rgba(28, 25, 23, 0.8)',
                border: value === s ? '1px solid #b45309' : '1px solid #44403c',
                color: value === s ? '#fcd34d' : '#a8a29e',
                boxShadow: value === s ? '2px 2px 2px rgba(0,0,0,0.6)' : 'none',
                cursor: 'pointer',
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      }
    />
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
    <SettingRow
      label={label}
      description={`${Math.round(value * 100)}%`}
      control={
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(value * 100)}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="accent-amber-600 cursor-pointer"
          style={{ width: 100, height: 4 }}
        />
      }
    />
  );
}

/** Amber primary button, matching the tile-select / merchant idiom. */
function AmberButton({
  children,
  onClick,
  disabled,
  small,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ boxShadow: disabled ? 'none' : '3px 3px 2px rgba(0,0,0,0.7)' }}
      className={`${small ? 'px-3 py-1 text-[10px]' : 'px-5 py-1.5 text-xs'} font-bold uppercase tracking-wider rounded-sm transition-transform ${
        disabled
          ? 'bg-stone-800 text-stone-600 cursor-not-allowed opacity-70'
          : 'bg-amber-800 text-amber-200 hover:bg-amber-700 active:translate-y-0.5'
      }`}
    >
      {children}
    </button>
  );
}

function StoneButton({
  children,
  onClick,
  small,
}: {
  children: React.ReactNode;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{ boxShadow: '3px 3px 2px rgba(0,0,0,0.7)', cursor: 'pointer' }}
      className={`${small ? 'px-3 py-1 text-[10px]' : 'px-5 py-1.5 text-xs'} font-bold uppercase tracking-wider rounded-sm bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700 active:translate-y-0.5 transition-transform`}
    >
      {children}
    </button>
  );
}

function RedButton({
  children,
  onClick,
  small,
}: {
  children: React.ReactNode;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{ boxShadow: '3px 3px 2px rgba(0,0,0,0.7)', cursor: 'pointer' }}
      className={`${small ? 'px-3 py-1 text-[10px]' : 'px-5 py-1.5 text-xs'} font-bold uppercase tracking-wider rounded-sm bg-red-900 text-red-200 border border-red-700 hover:bg-red-800 active:translate-y-0.5 transition-transform`}
    >
      {children}
    </button>
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
  const tutorialsEnabled = useSettingsStore((s) => s.tutorialsEnabled);
  const setTutorialsEnabled = useSettingsStore((s) => s.setTutorialsEnabled);
  const setGameSpeed = useSettingsStore((s) => s.setGameSpeed);
  const setMusicVolume = useSettingsStore((s) => s.setMusicVolume);
  const setSfxVolume = useSettingsStore((s) => s.setSfxVolume);

  const playerName = useMetaStore((s) => s.meta.playerName);
  const setPlayerName = useMetaStore((s) => s.setPlayerName);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(playerName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [auth, setAuth] = useState<AuthState>(() => ({ ...getAuthState() }));
  useEffect(() => subscribeAuth(setAuth), []);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const confirmName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameInput(playerName);
      setEditingName(false);
      return;
    }
    // Guest rename: local only, no server round-trip.
    if (!auth.isLoggedIn) {
      setPlayerName(trimmed);
      setEditingName(false);
      return;
    }
    // Logged-in rename: validate + uniqueness check + server update.
    const validation = validateDisplayName(trimmed);
    if (!validation.ok) {
      setNameError(validation.message);
      return;
    }
    setSaving(true);
    setNameError(null);
    const available = await checkDisplayNameAvailable(trimmed);
    if (!available && trimmed.toLowerCase() !== playerName.toLowerCase()) {
      setNameError('That name is taken.');
      setSaving(false);
      return;
    }
    const result = await updateDisplayName(trimmed);
    setSaving(false);
    if (!result.ok) {
      setNameError(
        result.reason === 'taken'
          ? 'That name is taken.'
          : result.message ?? 'Could not save. Try again.',
      );
      return;
    }
    setPlayerName(trimmed);
    setEditingName(false);
  };

  const handleBack = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    // logout() already routes to main-menu.
  };

  return (
    <div
      className="relative flex flex-col items-center h-full"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${import.meta.env.BASE_URL}assets/blur.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Header */}
      <div className="mt-5 mb-3 text-center">
        <h2
          className="text-xl text-amber-400 font-bold uppercase"
          style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill', letterSpacing: '1px' }}
        >
          Settings
        </h2>
      </div>

      {/* Settings list */}
      <div className="w-full max-w-[360px] px-3">
        <div
          className="rounded-sm border border-stone-700 divide-y divide-stone-700/60"
          style={{ backgroundColor: 'rgba(28, 25, 23, 0.7)', boxShadow: '3px 3px 2px rgba(0,0,0,0.6)' }}
        >
          {/* Change Name */}
          <div className="flex flex-col px-2.5 py-1 gap-0.5">
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col gap-px min-w-0">
                <span className="text-xs text-stone-200">Name</span>
                <span className="text-[9px] text-stone-500 leading-tight">
                  {auth.isLoggedIn ? 'Your account display name' : 'Your display name'}
                </span>
              </div>
              {editingName ? (
                <div className="flex gap-1 items-center ml-3">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => { setNameInput(e.target.value); setNameError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmName(); if (e.key === 'Escape') { setNameInput(playerName); setNameError(null); setEditingName(false); } }}
                    maxLength={DISPLAY_NAME_MAX}
                    autoFocus
                    disabled={saving}
                    className="bg-stone-900/70 border border-stone-700 text-stone-100 text-[11px] px-2 py-0.5 rounded-sm outline-none focus:border-amber-600 disabled:opacity-60"
                    style={{ width: 150, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' }}
                  />
                  <AmberButton small onClick={confirmName} disabled={saving}>
                    {saving ? '...' : 'OK'}
                  </AmberButton>
                </div>
              ) : (
                <div className="flex items-center gap-2 ml-3">
                  {playerName && (
                    <span className="text-[11px] text-amber-300 truncate max-w-[120px]">{playerName}</span>
                  )}
                  <StoneButton small onClick={() => { setNameInput(playerName); setNameError(null); setEditingName(true); }}>
                    Change
                  </StoneButton>
                </div>
              )}
            </div>
            {nameError && (
              <span className="text-[10px] text-red-400">{nameError}</span>
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
            description="Tile pop, bounce, particles, flashes"
            checked={juiceAnimationsEnabled}
            onChange={setJuiceAnimations}
          />
          <Toggle
            label="Tutorials"
            description="Show tutorial popups for new mechanics"
            checked={tutorialsEnabled}
            onChange={setTutorialsEnabled}
          />
        </div>
      </div>

      {/* Account section */}
      {auth.isLoggedIn && (
        <div className="w-full max-w-[360px] px-3 mt-3">
          <div
            className="rounded-sm border border-stone-700 flex items-center justify-between px-2.5 py-1"
            style={{ backgroundColor: 'rgba(28, 25, 23, 0.7)', boxShadow: '3px 3px 2px rgba(0,0,0,0.6)' }}
          >
            <div className="flex flex-col gap-px min-w-0">
              <span className="text-xs text-stone-200">Account</span>
              <span className="text-[9px] text-stone-500 leading-tight">
                Signed in as <span className="text-amber-300">{auth.displayName ?? '...'}</span>
              </span>
            </div>
            <RedButton small onClick={() => setShowLogoutConfirm(true)}>Sign Out</RedButton>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Back button */}
      <div className="py-3">
        <StoneButton onClick={handleBack}>Back</StoneButton>
      </div>

      {/* Sign-out confirmation */}
      {showLogoutConfirm && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
          <div
            className="rounded-sm border border-stone-700 p-5 max-w-xs text-center"
            style={{ backgroundColor: 'rgba(28, 25, 23, 0.95)', boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
          >
            <p className="text-stone-300 text-xs mb-4 leading-snug">
              Sign out? Your account progress is safe on the server; local guest data on this device will be reset.
            </p>
            <div className="flex gap-3 justify-center">
              <RedButton onClick={handleLogout}>Sign Out</RedButton>
              <StoneButton onClick={() => setShowLogoutConfirm(false)}>Cancel</StoneButton>
            </div>
          </div>
        </div>
      )}
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
  const tutorialsEnabled = useSettingsStore((s) => s.tutorialsEnabled);
  const setTutorialsEnabled = useSettingsStore((s) => s.setTutorialsEnabled);

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

          <div className="flex items-center justify-between">
            <span className="text-stone-300">Tutorials</span>
            <button
              onClick={() => setTutorialsEnabled(!tutorialsEnabled)}
              className="text-[9px] px-2 py-0.5 border"
              style={{
                backgroundColor: tutorialsEnabled ? 'rgba(180, 83, 9, 0.4)' : 'rgba(28, 25, 23, 0.4)',
                borderColor: tutorialsEnabled ? '#b45309' : '#44403c',
                color: tutorialsEnabled ? '#fbbf24' : '#78716c',
                cursor: 'pointer',
              }}
            >
              {tutorialsEnabled ? 'ON' : 'OFF'}
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
