import { create } from 'zustand';

const STORAGE_KEY = 'omitc-settings';

interface Settings {
  screenShakeEnabled: boolean;
  juiceAnimationsEnabled: boolean;
}

interface SettingsStore extends Settings {
  setScreenShake: (enabled: boolean) => void;
  setJuiceAnimations: (enabled: boolean) => void;
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
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
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...loadSettings(),

  setScreenShake: (enabled) =>
    set((state) => {
      const next = { screenShakeEnabled: enabled, juiceAnimationsEnabled: state.juiceAnimationsEnabled };
      persist(next);
      return { screenShakeEnabled: enabled };
    }),

  setJuiceAnimations: (enabled) =>
    set((state) => {
      const next = { screenShakeEnabled: state.screenShakeEnabled, juiceAnimationsEnabled: enabled };
      persist(next);
      return { juiceAnimationsEnabled: enabled };
    }),
}));
