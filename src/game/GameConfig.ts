import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { CombatScene } from './scenes/CombatScene';
import { CutsceneScene } from './scenes/CutsceneScene';

/**
 * Internal Phaser resolution (16:9).
 * Larger than the React UI overlay (960x540 / 2 = 480x270) so the board
 * (8x32 = 256px) takes proportionally less space while keeping 2x sprites.
 */
export const GAME_WIDTH = 560;
export const GAME_HEIGHT = 315;

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
  backgroundColor: '#1a1a2e',
  scene: [BootScene, CombatScene, CutsceneScene],
};
