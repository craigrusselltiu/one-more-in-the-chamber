import Phaser from 'phaser';
import { EventBus, GameEvent } from '../EventBus';
import { useSettingsStore } from '../../store/settingsStore';
import { useRunStore } from '../../store/runStore';

/**
 * BootScene: asset loading and music management.
 *
 * Music flow:
 *   main_menu  -> plays on main menu until character select
 *   map_theme  -> plays while traversing the map (not in-combat map overlay)
 *   act1/2/3_theme -> plays during combat encounters in that act
 *   shop_theme -> plays in shop and event screens
 *   boss themes -> dustys/copperheads/ironeyes_theme during boss fights
 *
 * All transitions use fade in/out. Volume tweens use proxy objects to
 * avoid crashes from Phaser's WebAudioSound node being nullified.
 */
export class BootScene extends Phaser.Scene {
  private currentMusic: Phaser.Sound.BaseSound | null = null;
  private currentKey = '';
  private targetVolume = 0.5;
  private fadeTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const base = import.meta.env.BASE_URL;
    // Music
    this.load.audio('main_menu', `${base}assets/audio/main_menu.mp3`);
    this.load.audio('map_theme', `${base}assets/audio/map_theme.mp3`);
    this.load.audio('act1_theme', `${base}assets/audio/act1_theme.mp3`);
    this.load.audio('act2_theme', `${base}assets/audio/act2_theme.mp3`);
    this.load.audio('act3_theme', `${base}assets/audio/act3_theme.mp3`);
    this.load.audio('shop_theme', `${base}assets/audio/shop_theme.mp3`);
    this.load.audio('dustys_theme', `${base}assets/audio/dustys_theme.mp3`);
    this.load.audio('copperheads_theme', `${base}assets/audio/copperheads_theme.mp3`);
    this.load.audio('ironeyes_theme', `${base}assets/audio/ironeyes_theme.mp3`);
    // SFX
    this.load.audio('sfx_click', `${base}assets/audio/sfx/click.wav`);
    this.load.audio('sfx_swap', `${base}assets/audio/sfx/swap.wav`);
    this.load.audio('sfx_match1', `${base}assets/audio/sfx/match1.wav`);
    this.load.audio('sfx_match2', `${base}assets/audio/sfx/match2.wav`);
    this.load.audio('sfx_match3', `${base}assets/audio/sfx/match3.wav`);
    this.load.audio('sfx_match_pitch', `${base}assets/audio/sfx/match_pitch.wav`);
    // Backgrounds
    this.load.image('act1_bg', `${base}assets/act1_bg.png`);
    // Sprites
    this.load.spritesheet('items_sheet', `${base}assets/sprites/items_sheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create(): void {
    this.cameras.main.setRoundPixels(true);

    // Live volume: apply musicVolume changes to currently playing music
    useSettingsStore.subscribe((state, prev) => {
      if (state.musicVolume !== prev.musicVolume && this.currentMusic) {
        this.safeSetVolume(this.currentMusic, this.targetVolume);
      }
    });

    // Track what music SHOULD be playing. The gesture handler will start
    // it once the browser allows audio. Screen changes update this immediately
    // so even if the user clicks before audio is unlocked, the right track plays.
    let desiredTrack = 'main_menu';
    let audioUnlocked = false;

    const startOnGesture = () => {
      document.removeEventListener('click', startOnGesture);
      audioUnlocked = true;
      // Defer playback to next frame so any screen change from this same
      // click event updates desiredTrack first.
      requestAnimationFrame(() => {
        if (desiredTrack && !this.currentMusic) {
          this.playTrack(desiredTrack);
        }
      });
    };
    // Use 'click' (not pointerdown) so React onClick handlers fire first
    document.addEventListener('click', startOnGesture);

    // Music transitions on screen changes
    EventBus.on(GameEvent.SCREEN_CHANGE, (...args: unknown[]) => {
      const screen = args[0] as string;

      // Helper: set desired track and play if audio is unlocked
      const setTrack = (track: string) => {
        desiredTrack = track;
        if (audioUnlocked) this.playTrack(track);
      };

      switch (screen) {
        case 'main-menu':
          setTrack('main_menu');
          break;
        case 'settings':
        case 'leaderboard':
        case 'reputation-shop':
          // Main menu sub-screens: don't change music
          break;
        case 'character-select':
        case 'tile-select':
          // Keep current music
          break;
        case 'map':
          setTrack('map_theme');
          break;
        case 'combat': {
          const run = useRunStore.getState().run;
          if (!run) break;
          const currentNode = run.mapState?.nodes.find((n) => n.id === run.currentNodeId);
          if (currentNode?.type === 'boss') {
            const bossThemes: Record<number, string> = {
              1: 'dustys_theme',
              2: 'copperheads_theme',
              3: 'ironeyes_theme',
            };
            setTrack(bossThemes[run.currentAct] ?? `act${run.currentAct}_theme`);
          } else {
            setTrack(`act${run.currentAct}_theme`);
          }
          break;
        }
        case 'shop':
        case 'event':
          setTrack('shop_theme');
          break;
        case 'rest-site':
        case 'treasure':
          // Keep map music
          break;
        case 'score':
          desiredTrack = '';
          if (audioUnlocked) this.fadeOut();
          break;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Unified music player
  // ---------------------------------------------------------------------------

  private safeSetVolume(sound: Phaser.Sound.BaseSound, vol: number): void {
    try {
      (sound as Phaser.Sound.WebAudioSound).setVolume(vol * useSettingsStore.getState().musicVolume);
    } catch { /* audio node may be null */ }
  }

  /** Play a music track with fade-in. If already playing, do nothing. */
  private playTrack(key: string, volume = 0.5): void {
    if (this.currentKey === key && this.currentMusic) return;

    // Fade out current music first
    this.fadeOut(() => {
      // Start new track
      try {
        const music = this.sound.add(key, { loop: true, volume: 0 });
        music.play();
        this.currentMusic = music;
        this.currentKey = key;
        this.targetVolume = volume;

        // Fade in
        const proxy = { vol: 0 };
        this.fadeTween = this.tweens.add({
          targets: proxy,
          vol: volume,
          duration: 800,
          onUpdate: () => {
            this.targetVolume = proxy.vol;
            this.safeSetVolume(music, proxy.vol);
          },
          onComplete: () => { this.fadeTween = null; },
        });
      } catch { /* ignore audio errors */ }
    });
  }

  /** Fade out current music. Calls onComplete when done. */
  private fadeOut(onComplete?: () => void): void {
    // Cancel any running fade
    if (this.fadeTween) {
      this.fadeTween.stop();
      this.fadeTween = null;
    }

    const music = this.currentMusic;
    if (!music) {
      this.currentKey = '';
      onComplete?.();
      return;
    }

    this.currentMusic = null;
    this.currentKey = '';

    let currentVol: number;
    try {
      currentVol = (music as Phaser.Sound.WebAudioSound).volume ?? 0.5;
    } catch {
      currentVol = 0.5;
    }

    const proxy = { vol: currentVol };
    this.fadeTween = this.tweens.add({
      targets: proxy,
      vol: 0,
      duration: 500,
      onUpdate: () => this.safeSetVolume(music, proxy.vol),
      onComplete: () => {
        this.fadeTween = null;
        try { music.stop(); } catch { /* ignore */ }
        try { music.destroy(); } catch { /* ignore */ }
        onComplete?.();
      },
    });
  }
}
