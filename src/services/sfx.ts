import { useSettingsStore } from '../store/settingsStore';

let game: Phaser.Game | null = null;

export function initSfx(phaserGame: Phaser.Game): void {
  game = phaserGame;
}

function play(key: string, volume = 0.5, rate = 1.0): void {
  if (!game) return;
  const master = useSettingsStore.getState().masterVolume;
  try {
    const sound = game.sound.add(key, { volume: volume * master });
    sound.play({ rate });
    // Auto-cleanup after playing
    sound.once('complete', () => sound.destroy());
  } catch { /* ignore */ }
}

export function playClick(): void {
  play('sfx_click', 0.3);
}

export function playSwapFail(): void {
  play('sfx_swap', 0.4);
}

export function playMatch(comboStep: number): void {
  // Play a random match SFX
  const idx = Math.floor(Math.random() * 3) + 1;
  play(`sfx_match${idx}`, 0.4);

  // Also play the pitch SFX with higher pitch for higher combos
  const pitchRate = 1.0 + (comboStep - 1) * 0.15; // goes up with combo
  play('sfx_match_pitch', 0.3, Math.min(pitchRate, 2.5));
}
