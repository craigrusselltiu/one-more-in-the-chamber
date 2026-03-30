import Phaser from 'phaser';

/**
 * BootScene: asset loading and initialization.
 * MVP loads no image assets -- all visuals are drawn at runtime.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // MVP: no external assets to load.
    // Future: load sprite sheets, audio, fonts here.
  }

  create(): void {
    this.cameras.main.setRoundPixels(true);
    this.scene.start('CombatScene');
  }
}
