import Phaser from 'phaser';
import { EventBus, GameEvent } from '../EventBus';

/**
 * BootScene: asset loading and initialization.
 * MVP loads no image assets -- all visuals are drawn at runtime.
 */
export class BootScene extends Phaser.Scene {
  private menuMusic: Phaser.Sound.BaseSound | null = null;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.audio('combat_theme', 'assets/audio/combat_theme.mp3');
    this.load.audio('main_menu', 'assets/audio/main_menu.mp3');
  }

  create(): void {
    this.cameras.main.setRoundPixels(true);

    // Start menu music on boot (initial screen is main-menu)
    this.playMenuMusic();

    // Manage music on screen transitions
    EventBus.on(GameEvent.SCREEN_CHANGE, (...args: unknown[]) => {
      const screen = args[0] as string;
      if (screen === 'main-menu') {
        this.playMenuMusic();
      } else if (this.menuMusic) {
        this.fadeOutMenuMusic();
      }
    });
  }

  private playMenuMusic(): void {
    if (this.menuMusic) return;

    try {
      const music = this.sound.add('main_menu', { loop: true, volume: 0 });
      music.play();
      this.tweens.add({
        targets: music,
        volume: 0.5,
        duration: 2000,
      });
      this.menuMusic = music;
    } catch {
      // Audio autoplay blocked on mobile — music will remain silent
    }
  }

  private fadeOutMenuMusic(): void {
    const music = this.menuMusic;
    if (!music) return;
    this.menuMusic = null;

    this.tweens.add({
      targets: music,
      volume: 0,
      duration: 1000,
      onComplete: () => {
        music.stop();
        music.destroy();
      },
    });
  }
}
