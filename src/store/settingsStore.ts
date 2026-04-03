import { create } from 'zustand';

const STORAGE_KEY = 'omitc-settings';

export type GameSpeed = 1 | 2 | 3;

interface Settings {
  screenShakeEnabled: boolean;
  juiceAnimationsEnabled: boolean;
  gameSpeed: GameSpeed;
  musicVolume: number; // 0-1
  sfxVolume: number;   // 0-1
}

interface SettingsStore extends Settings {
  setScreenShake: (enabled: boolean) => void;
  setJuiceAnimations: (enabled: boolean) => void;
  setGameSpeed: (speed: GameSpeed) => void;
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate from old masterVolume to separate sliders
      if ('masterVolume' in parsed && !('musicVolume' in parsed)) {
        parsed.musicVolume = parsed.masterVolume;
        parsed.sfxVolume = parsed.masterVolume;
        delete parsed.masterVolume;
      }
      return { ...DEFAULTS, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

function persist(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

const DEFAULTS: Settings = {
  screenShakeEnabled: true,
  juiceAnimationsEnabled: true,
  gameSpeed: 1,
  musicVolume: 0.5,
  sfxVolume: 0.5,
};

/** Get the animation duration multiplier (higher speed = lower duration). */
export function getSpeedMultiplier(): number {
  return useSettingsStore.getState().gameSpeed;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...loadSettings(),

  setScreenShake: (enabled) =>
    set(() => {
      const next = { ...strip(get()), screenShakeEnabled: enabled };
      persist(next);
      return { screenShakeEnabled: enabled };
    }),

  setJuiceAnimations: (enabled) =>
    set(() => {
      const next = { ...strip(get()), juiceAnimationsEnabled: enabled };
      persist(next);
      return { juiceAnimationsEnabled: enabled };
    }),

  setGameSpeed: (speed) =>
    set(() => {
      const next = { ...strip(get()), gameSpeed: speed };
      persist(next);
      return { gameSpeed: speed };
    }),

  setMusicVolume: (volume) =>
    set(() => {
      const clamped = Math.max(0, Math.min(1, volume));
      const next = { ...strip(get()), musicVolume: clamped };
      persist(next);
      return { musicVolume: clamped };
    }),

  setSfxVolume: (volume) =>
    set(() => {
      const clamped = Math.max(0, Math.min(1, volume));
      const next = { ...strip(get()), sfxVolume: clamped };
      persist(next);
      return { sfxVolume: clamped };
    }),
}));

/** Strip methods from state for persistence. */
function strip(state: SettingsStore): Settings {
  return {
    screenShakeEnabled: state.screenShakeEnabled,
    juiceAnimationsEnabled: state.juiceAnimationsEnabled,
    gameSpeed: state.gameSpeed,
    musicVolume: state.musicVolume,
    sfxVolume: state.sfxVolume,
  };
}
