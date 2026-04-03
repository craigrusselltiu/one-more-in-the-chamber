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
  private combatMusic: Phaser.Sound.BaseSound | null = null;
  private fadeOutTween: Phaser.Tweens.Tween | null = null;
  private fadeInTween: Phaser.Tweens.Tween | null = null;
  private combatFadeTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const base = import.meta.env.BASE_URL;
    this.load.audio('combat_theme', `${base}assets/audio/combat_theme.mp3`);
    this.load.audio('main_menu', `${base}assets/audio/main_menu.mp3`);
    this.load.audio('sfx_click', `${base}assets/audio/sfx/click.wav`);
    this.load.audio('sfx_swap', `${base}assets/audio/sfx/swap.wav`);
    this.load.audio('sfx_match1', `${base}assets/audio/sfx/match1.wav`);
    this.load.audio('sfx_match2', `${base}assets/audio/sfx/match2.wav`);
    this.load.audio('sfx_match3', `${base}assets/audio/sfx/match3.wav`);
    this.load.audio('sfx_match_pitch', `${base}assets/audio/sfx/match_pitch.wav`);
    this.load.spritesheet('items_sheet', `${base}assets/sprites/items_sheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  /** Target volume for currently playing music (before master scaling). */
  private menuMusicTarget = 0.5;
  private combatMusicTarget = 0.4;

  create(): void {
    this.cameras.main.setRoundPixels(true);

    // Live volume: subscribe to musicVolume changes and apply to active music
    useSettingsStore.subscribe((state, prev) => {
      if (state.musicVolume !== prev.musicVolume) {
        if (this.menuMusic) this.safeSetVolume(this.menuMusic, this.menuMusicTarget);
        if (this.combatMusic) this.safeSetVolume(this.combatMusic, this.combatMusicTarget);
      }
    });

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
        this.stopCombatMusic();
        this.playMenuMusic();
      } else if (screen === 'settings') {
        // Settings screen: don't change music at all
      } else if (screen === 'combat') {
        this.fadeOutMenuMusic();
        this.playCombatMusic();
      } else {
        // Non-combat, non-menu screens (map, shop, etc.): stop combat music if playing
        if (this.combatMusic) {
          this.stopCombatMusic();
        }
        if (this.menuMusic) {
          this.fadeOutMenuMusic();
        }
      }
    });
  }

  private safeSetVolume(sound: Phaser.Sound.BaseSound, vol: number): void {
    try { (sound as Phaser.Sound.WebAudioSound).setVolume(vol * useSettingsStore.getState().musicVolume); } catch { /* audio node may be null */ }
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
    this.menuMusicTarget = 0.5;
    const proxy = { vol: 0 };
    this.fadeInTween = this.tweens.add({
      targets: proxy,
      vol: 0.5,
      duration: 2000,
      onUpdate: () => { this.menuMusicTarget = proxy.vol; this.safeSetVolume(music, proxy.vol); },
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

  // ---------------------------------------------------------------------------
  // Combat Music
  // ---------------------------------------------------------------------------

  private playCombatMusic(): void {
    if (this.combatMusic) return;

    const music = this.sound.add('combat_theme', { loop: true, volume: 0 });
    try { music.play(); } catch { /* ignore */ }
    this.combatMusic = music;

    this.combatMusicTarget = 0.4;
    const proxy = { vol: 0 };
    this.combatFadeTween = this.tweens.add({
      targets: proxy,
      vol: 0.4,
      duration: 2000,
      onUpdate: () => { this.combatMusicTarget = proxy.vol; this.safeSetVolume(music, proxy.vol); },
      onComplete: () => { this.combatFadeTween = null; },
    });
  }

  private stopCombatMusic(): void {
    const music = this.combatMusic;
    if (!music) return;
    this.combatMusic = null;

    if (this.combatFadeTween) {
      this.combatFadeTween.stop();
      this.combatFadeTween = null;
    }

    const currentVol = (music as Phaser.Sound.WebAudioSound).volume ?? 0.4;
    const proxy = { vol: currentVol };
    this.tweens.add({
      targets: proxy,
      vol: 0,
      duration: 1000,
      onUpdate: () => this.safeSetVolume(music, proxy.vol),
      onComplete: () => {
        try { music.stop(); } catch { /* ignore */ }
        try { music.destroy(); } catch { /* ignore */ }
      },
    });
  }
}
