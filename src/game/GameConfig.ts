import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { CombatScene } from './scenes/CombatScene';
import { CutsceneScene } from './scenes/CutsceneScene';

/** Internal resolution: 480x270 (landscape 16:9). Integer-scaled to display. */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: true,
  },
  input: {
    touch: {
      capture: true,
    },
  },
  backgroundColor: '#1a1a2e',
  scene: [BootScene, CombatScene, CutsceneScene],
};
