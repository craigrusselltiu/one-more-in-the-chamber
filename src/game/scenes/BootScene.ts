import Phaser from 'phaser';
import { EventBus, GameEvent } from '../EventBus';
import { useSettingsStore } from '../../store/settingsStore';

/**
 * BootScene: asset loading and initialization.
 * MVP loads no image assets -- all visuals are drawn at runtime.
 *
 * IMPORTANT: All sound volume tweens use proxy objects instead of tweening
 * Phaser sounds directly. Phaser's WebAudioSound can have its audio node
 * nullified (e.g. on context suspend), and a crash in any scene's
 * TweenManager blocks ALL subsequent scenes from updating (Phaser's
 * SceneManager.update has no try-catch isolation between scenes).
 */
export class BootScene extends Phaser.Scene {
  private menuMusic: Phaser.Sound.BaseSound | null = null;
  private fadeOutTween: Phaser.Tweens.Tween | null = null;
  private fadeInTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.audio('combat_theme', 'assets/audio/combat_theme.mp3');
    this.load.audio('main_menu', 'assets/audio/main_menu.mp3');
  }

  create(): void {
    this.cameras.main.setRoundPixels(true);

    // Defer music until first user interaction to avoid AudioContext warning.
    // The browser blocks audio before a gesture; listen for the first click.
    const startOnGesture = () => {
      document.removeEventListener('pointerdown', startOnGesture);
      this.playMenuMusic();
    };
    document.addEventListener('pointerdown', startOnGesture);

    // Manage music on screen transitions
    EventBus.on(GameEvent.SCREEN_CHANGE, (...args: unknown[]) => {
      const screen = args[0] as string;
      if (screen === 'main-menu') {
        document.removeEventListener('pointerdown', startOnGesture);
        this.playMenuMusic();
      } else if (this.menuMusic) {
        this.fadeOutMenuMusic();
      }
    });
  }

  private safeSetVolume(sound: Phaser.Sound.BaseSound, vol: number): void {
    try { (sound as Phaser.Sound.WebAudioSound).setVolume(vol * useSettingsStore.getState().masterVolume); } catch { /* audio node may be null */ }
  }

  private playMenuMusic(): void {
    if (this.menuMusic) return;

    // Cancel any running fade-out on the old music
    if (this.fadeOutTween) {
      this.fadeOutTween.stop();
      this.fadeOutTween = null;
    }

    const music = this.sound.add('main_menu', { loop: true, volume: 0 });
    try { music.play(); } catch { /* ignore */ }
    this.menuMusic = music;

    // Fade in via proxy to avoid direct volume tween crash
    const proxy = { vol: 0 };
    this.fadeInTween = this.tweens.add({
      targets: proxy,
      vol: 0.5,
      duration: 2000,
      onUpdate: () => this.safeSetVolume(music, proxy.vol),
      onComplete: () => { this.fadeInTween = null; },
    });
  }

  private fadeOutMenuMusic(): void {
    const music = this.menuMusic;
    if (!music) return;
    this.menuMusic = null;

    // Cancel any running fade-in
    if (this.fadeInTween) {
      this.fadeInTween.stop();
      this.fadeInTween = null;
    }
    // Cancel any previous fade-out
    if (this.fadeOutTween) {
      this.fadeOutTween.stop();
      this.fadeOutTween = null;
    }

    const currentVol = (music as Phaser.Sound.WebAudioSound).volume ?? 0.5;
    const proxy = { vol: currentVol };
    this.fadeOutTween = this.tweens.add({
      targets: proxy,
      vol: 0,
      duration: 1000,
      onUpdate: () => this.safeSetVolume(music, proxy.vol),
      onComplete: () => {
        this.fadeOutTween = null;
        try { music.stop(); } catch { /* ignore */ }
        try { music.destroy(); } catch { /* ignore */ }
      },
    });
  }
}
