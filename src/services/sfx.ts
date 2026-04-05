import { useSettingsStore } from '../store/settingsStore';

let game: Phaser.Game | null = null;

export function initSfx(phaserGame: Phaser.Game): void {
  game = phaserGame;
}

function play(key: string, volume = 0.5, rate = 1.0): void {
  if (!game) return;
  const sfxVol = useSettingsStore.getState().sfxVolume;
  try {
    const sound = game.sound.add(key, { volume: volume * sfxVol });
    sound.play({ rate });
    // Auto-cleanup after playing
    sound.once('complete', () => sound.destroy());
  } catch { /* ignore */ }
}

export function playClick(): void {
  play('sfx_click', 0.5);
}

export function playHover(): void {
  play('sfx_hover', 0.4);
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

let campfireSound: Phaser.Sound.BaseSound | null = null;

export function playCampfire(): void {
  stopCampfire();
  if (!game) return;
  const sfxVol = useSettingsStore.getState().sfxVolume;
  try {
    const sound = game.sound.add('sfx_campfire', { volume: 0.25 * sfxVol });
    campfireSound = sound;
    sound.play();
    // Fade out over the last 2 seconds
    const fadeStart = Math.max(0, (sound.duration - 2) * 1000);
    setTimeout(() => {
      if (!game || campfireSound !== sound) return;
      const scene = game.scene.getScenes(true)[0];
      if (scene) {
        scene.tweens.add({
          targets: sound,
          volume: 0,
          duration: 2000,
          onComplete: () => { sound.destroy(); if (campfireSound === sound) campfireSound = null; },
        });
      }
    }, fadeStart);
    sound.once('complete', () => { if (campfireSound === sound) campfireSound = null; });
  } catch { /* ignore */ }
}

export function stopCampfire(): void {
  if (campfireSound) {
    try { campfireSound.destroy(); } catch { /* ignore */ }
    campfireSound = null;
  }
}

export function playTreasure(): void {
  play('sfx_treasure', 0.5);
}

export function playShop(): void {
  play('sfx_shop', 0.5);
}

export function playUpgrade(): void {
  play('sfx_upgrade', 0.5);
}

export function playDeadeyeShot(): void {
  // Gunshot SFX for Deadeye shots (lower pitch match as fallback until gunshot.wav is added)
  play('sfx_gunshot', 0.3);
}
