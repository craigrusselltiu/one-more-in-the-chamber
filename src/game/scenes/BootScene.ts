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
    this.load.audio('combat_theme', 'assets/audio/combat_theme.mp3');
    this.load.audio('main_menu', 'assets/audio/main_menu.mp3');
  }

  create(): void {
    this.cameras.main.setRoundPixels(true);
    // CombatScene is started on demand when navigating to combat.
  }
}
