import { memo, useEffect, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useSettingsStore } from '../../store/settingsStore';
import { useMetaStore } from '../../store/metaStore';
import { getAuthState, subscribeAuth, logout, type AuthState } from '../../services/auth';
import { updateDisplayName, validateDisplayName, checkDisplayNameAvailable, DISPLAY_NAME_MAX } from '../../services/players';
import { FullScreenOverlay } from '../components/FullScreenOverlay';
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
      className="flex items-center justify-between w-full py-2 px-4 bg-transparent border-none outline-none text-left"
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
                color: value === s ? '#fcd34d' : '#a8a29e',
                boxShadow: value === s ? '2px 2px 1px rgba(0,0,0,0.4)' : 'none',
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
      style={{ boxShadow: disabled ? 'none' : '2px 2px 1px rgba(0,0,0,0.4)' }}
      className={`${small ? 'px-3 py-1 text-[10px]' : 'px-5 py-1.5 text-xs'} rounded-sm transition-transform ${
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
      style={{ boxShadow: '2px 2px 1px rgba(0,0,0,0.4)', cursor: 'pointer' }}
      className={`${small ? 'px-3 py-1 text-[10px]' : 'px-5 py-1.5 text-xs'} rounded-sm bg-stone-800 text-stone-300 hover:bg-stone-700 active:translate-y-0.5 transition-transform`}
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
      style={{ boxShadow: '2px 2px 1px rgba(0,0,0,0.4)', cursor: 'pointer' }}
      className={`${small ? 'px-3 py-1 text-[10px]' : 'px-5 py-1.5 text-xs'} rounded-sm bg-red-900 text-red-200 hover:bg-red-800 active:translate-y-0.5 transition-transform`}
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
          className="rounded-sm divide-y divide-stone-700/60"
          style={{ backgroundColor: 'rgba(28, 25, 23, 0.7)', boxShadow: '3px 3px 2px rgba(0,0,0,0.6)' }}
        >
          {/* Change Name */}
          <div className="flex flex-col px-4 py-2 gap-0.5">
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
                    className="bg-stone-900/70 text-stone-100 text-[11px] px-2 py-0.5 rounded-sm outline-none disabled:opacity-60"
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
            className="rounded-sm flex items-center justify-between px-4 py-2"
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
        <FullScreenOverlay backdropClass="bg-black/40" zIndex={150}>
          <div
            className="rounded-sm p-5 max-w-xs text-center"
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
        </FullScreenOverlay>
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
    <FullScreenOverlay backdropClass="bg-black/40" zIndex={140} onBackdropClick={onClose}>
      <div
        className="rounded-sm p-3 flex flex-col gap-2"
        style={{ width: 280, backgroundColor: 'rgba(28, 25, 23, 0.95)', boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
      >
        <h3
          className="text-[11px] text-amber-400 text-center font-bold uppercase"
          style={{ WebkitTextStroke: '2px #000', paintOrder: 'stroke fill', letterSpacing: '1px' }}
        >
          Settings
        </h3>

        {/* Same options controls as the main Settings screen */}
        <div className="rounded-sm divide-y divide-stone-700/60" style={{ backgroundColor: 'rgba(28, 25, 23, 0.6)' }}>
          <VolumeSlider label="Music" value={musicVolume} onChange={setMusicVolume} />
          <VolumeSlider label="SFX" value={sfxVolume} onChange={setSfxVolume} />
          <SpeedSelector value={gameSpeed} onChange={setGameSpeed} />
          <Toggle
            label="Screen Shake"
            description="Camera shake on big hits"
            checked={screenShakeEnabled}
            onChange={setScreenShake}
          />
          <Toggle
            label="Animations"
            description="Tile pop, particles, flashes"
            checked={juiceAnimationsEnabled}
            onChange={setJuiceAnimations}
          />
          <Toggle
            label="Tutorials"
            description="Popups for new mechanics"
            checked={tutorialsEnabled}
            onChange={setTutorialsEnabled}
          />
        </div>

        {/* Main Menu / Give Up / Close */}
        <div className="mt-1 flex flex-col gap-1.5">
          <StoneButton small onClick={onMainMenu}>Main Menu</StoneButton>
          {!confirmGiveUp ? (
            <RedButton small onClick={() => setConfirmGiveUp(true)}>Give Up</RedButton>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              <RedButton small onClick={onGiveUp}>Confirm</RedButton>
              <StoneButton small onClick={() => setConfirmGiveUp(false)}>Cancel</StoneButton>
            </div>
          )}
          <StoneButton small onClick={onClose}>Close</StoneButton>
        </div>
      </div>
    </FullScreenOverlay>
  );
});
