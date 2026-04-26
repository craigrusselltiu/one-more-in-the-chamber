import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { CombatScene } from './scenes/CombatScene';
import { CutsceneScene } from './scenes/CutsceneScene';

/**
 * Internal Phaser resolution (16:9).
 * Matches the React UI overlay exactly (960x540) so every canvas pixel
 * maps 1:1 to a screen pixel -- no upscaling, no sub-pixel blur.
 */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  transparent: true,
  scene: [BootScene, CombatScene, CutsceneScene],
};
