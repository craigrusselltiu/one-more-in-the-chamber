import Phaser from 'phaser';
import { EventBus, GameEvent } from '../EventBus';
import { useSettingsStore } from '../../store/settingsStore';
import type { CombatConfig } from '../combat/CombatManager';
import type { CombatSnapshot } from '../../types/combatSnapshot';

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
  /** Sound currently being faded out (so it can be cleaned up if interrupted). */
  private fadingOutSound: Phaser.Sound.BaseSound | null = null;
  /** Music volume multiplier while Deadeye is active. */
  private musicDuckMultiplier = 1;
  private deadeyeMusicDucking = false;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const base = import.meta.env.BASE_URL;
    // Report per-file load progress so the React loading screen can render a bar.
    this.load.on(Phaser.Loader.Events.PROGRESS, () => {
      EventBus.emit(GameEvent.BOOT_PROGRESS, {
        loaded: this.load.totalComplete,
        total: this.load.totalToLoad,
      });
    });
    // Music
    this.load.audio('main_menu', `${base}assets/audio/main_menu.mp3`);
    this.load.audio('map_theme', `${base}assets/audio/map_theme.mp3`);
    this.load.audio('act1_theme', `${base}assets/audio/act1_theme.mp3`);
    this.load.audio('act1_theme_alt', `${base}assets/audio/act1_theme_alt.mp3`);
    this.load.audio('act1_theme_alt2', `${base}assets/audio/act1_theme_alt2.mp3`);
    this.load.audio('elite_theme', `${base}assets/audio/elite_theme.mp3`);
    this.load.audio('elite_theme_alt', `${base}assets/audio/elite_theme_alt.mp3`);
    this.load.audio('act2_theme', `${base}assets/audio/act2_theme.mp3`);
    this.load.audio('act2_theme_alt', `${base}assets/audio/act2_theme_alt.mp3`);
    this.load.audio('act2_theme_alt2', `${base}assets/audio/act2_theme_alt2.mp3`);
    this.load.audio('act3_theme', `${base}assets/audio/act3_theme.mp3`);
    this.load.audio('act3_theme_alt', `${base}assets/audio/act3_theme_alt.mp3`);
    this.load.audio('act3_theme_alt2', `${base}assets/audio/act3_theme_alt2.mp3`);
    this.load.audio('shop_theme', `${base}assets/audio/shop_theme.mp3`);
    this.load.audio('dustys_theme', `${base}assets/audio/dustys_theme.mp3`);
    this.load.audio('copperheads_theme', `${base}assets/audio/copperheads_theme.mp3`);
    this.load.audio('ironeyes_theme', `${base}assets/audio/ironeyes_theme.mp3`);
    this.load.audio('outlaw_king_theme', `${base}assets/audio/outlaw_king_theme.mp3`);
    // SFX
    this.load.audio('sfx_click', `${base}assets/audio/sfx/click.wav`);
    this.load.audio('sfx_hover', `${base}assets/audio/sfx/hover.wav`);
    this.load.audio('sfx_swap', `${base}assets/audio/sfx/swap.wav`);
    this.load.audio('sfx_match1', `${base}assets/audio/sfx/match1.wav`);
    this.load.audio('sfx_match2', `${base}assets/audio/sfx/match2.wav`);
    this.load.audio('sfx_match3', `${base}assets/audio/sfx/match3.wav`);
    this.load.audio('sfx_match_pitch', `${base}assets/audio/sfx/match_pitch.wav`);
    this.load.audio('sfx_gunshot', `${base}assets/audio/sfx/gunshot.wav`);
    this.load.audio('sfx_hit', `${base}assets/audio/sfx/hit.wav`);
    this.load.audio('sfx_ability_ready', `${base}assets/audio/sfx/ability_ready.wav`);
    this.load.audio('sfx_block', `${base}assets/audio/sfx/block.wav`);
    this.load.audio('sfx_campfire', `${base}assets/audio/sfx/campfire.wav`);
    this.load.audio('sfx_treasure', `${base}assets/audio/sfx/treasure.wav`);
    this.load.audio('sfx_shop', `${base}assets/audio/sfx/shop.wav`);
    this.load.audio('sfx_upgrade', `${base}assets/audio/sfx/upgrade.wav`);
    this.load.audio('sfx_shuffle', `${base}assets/audio/sfx/shuffle.wav`);
    this.load.audio('sfx_revolver_spin', `${base}assets/audio/sfx/revolver_spin.wav`);
    this.load.audio('sfx_revolver_cock', `${base}assets/audio/sfx/revolver_cock.wav`);
    this.load.audio('sfx_deadeye_activate', `${base}assets/audio/sfx/deadeye.wav`);
    this.load.audio('sfx_holster', `${base}assets/audio/sfx/holster.wav`);
    // Backgrounds
    this.load.image('act1_bg', `${base}assets/backgrounds/act1_bg.png`);
    this.load.image('act2_bg', `${base}assets/backgrounds/act2_bg.png`);
    this.load.image('act3_bg', `${base}assets/backgrounds/act3_bg.png`);
    this.load.image('dusty_bg', `${base}assets/backgrounds/dusty_bg.png`);
    this.load.image('copperhead_bg', `${base}assets/backgrounds/copperhead_bg.png`);
    this.load.image('ironeye_bg', `${base}assets/backgrounds/ironeye_bg.png`);
    this.load.image('main_menu_bg', `${base}assets/backgrounds/main_menu_bg.png`);
    this.load.image('campfire_bg', `${base}assets/backgrounds/campfire_bg.png`);
    this.load.image('board_bg', `${base}assets/board_bg.png`);
    this.load.image('merchant_bg', `${base}assets/backgrounds/merchant_bg.png`);
    this.load.image('artifact_bg', `${base}assets/backgrounds/artifact_bg.png`);
    this.load.image('rust_bg', `${base}assets/backgrounds/rust_bg.png`);
    this.load.image('reno_bg', `${base}assets/backgrounds/reno_bg.png`);
    this.load.image('tile_bg', `${base}assets/backgrounds/tile_bg.png`);
    this.load.image('map_bg', `${base}assets/map_bg.png`);
    this.load.image('crate_bg', `${base}assets/backgrounds/crate_bg.png`);
    this.load.image('defeat', `${base}assets/backgrounds/defeat.png`);
    this.load.image('victory', `${base}assets/backgrounds/victory.png`);
    this.load.image('leaderboard', `${base}assets/backgrounds/leaderboard.png`);
    this.load.image('reputation', `${base}assets/backgrounds/reputation.png`);
    this.load.image('customize', `${base}assets/backgrounds/customize.png`);
    this.load.image('ledger', `${base}assets/backgrounds/ledger.png`);
    this.load.image('event_bridge', `${base}assets/events/event_bridge.png`);
    this.load.image('event_stranger', `${base}assets/events/event_stranger.png`);
    this.load.image('event_card', `${base}assets/events/event_card.png`);
    this.load.image('event_well', `${base}assets/events/event_well.png`);
    this.load.image('event_coyote', `${base}assets/events/event_coyote.png`);
    this.load.image('event_train', `${base}assets/events/event_train.png`);
    this.load.image('event_mine', `${base}assets/events/event_mine.png`);
    this.load.image('event_vulture', `${base}assets/events/event_vulture.png`);
    this.load.image('event_preacher', `${base}assets/events/event_preacher.png`);
    this.load.image('event_saloon', `${base}assets/events/event_saloon.png`);
    this.load.image('event_snake', `${base}assets/events/event_snake.png`);
    this.load.image('event_medicine', `${base}assets/events/event_medicine.png`);
    this.load.image('cardback', `${base}assets/events/cardback.png`);
    this.load.image('cardface', `${base}assets/events/cardface.png`);
    this.load.image('blur', `${base}assets/blur.png`);
    // Sprites -- items sheet used directly by canvas-based SpriteIcon.
    this.load.spritesheet('items_sheet', `${base}assets/sprites/items_sheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    // Character/enemy sprites rendered by React <img> tags. Preloading here
    // warms the browser HTTP cache so first-render on combat screens is instant
    // and the loading bar reflects their download progress.
    const SPRITE_IMAGES = [
      'bandit', 'canary', 'canary_alt', 'card_shark', 'copperhead', 'corrupt_deputy',
      'coyote', 'dust_devil', 'dusty', 'guard_dog', 'hangman', 'hellfire_preacher',
      'ironeye', 'ironeye_alt', 'mad_prospector', 'minecart', 'mining_foreman',
      'ore_golem', 'outlaw_king', 'pack_mule', 'powder_monkey', 'rattlesnake',
      'reno_sheet', 'rust_sheet', 'saloon_brawler', 'shadow',
      'sheriffs_shadow', 'train_guard', 'tumbleweed_golem', 'tunnel_rat', 'vulture',
    ];
    for (const name of SPRITE_IMAGES) {
      this.load.image(`sprite_${name}`, `${base}assets/sprites/${name}.png`);
    }
  }

  create(): void {
    this.cameras.main.setRoundPixels(true);
    // Signal that all assets are loaded and ready
    EventBus.emit(GameEvent.BOOT_COMPLETE);

    const handleCombatSceneRun = (...args: unknown[]) => {
      const data = args[0] as { config?: CombatConfig; snapshot?: CombatSnapshot } | undefined;
      this.scene.run('CombatScene', data);
    };

    const handleCombatSceneStop = () => {
      this.scene.stop('CombatScene');
    };

    this.events.once('shutdown', () => {
      EventBus.off(GameEvent.COMBAT_SCENE_RUN, handleCombatSceneRun);
      EventBus.off(GameEvent.COMBAT_SCENE_STOP, handleCombatSceneStop);
    });

    EventBus.on(GameEvent.COMBAT_SCENE_RUN, handleCombatSceneRun);
    EventBus.on(GameEvent.COMBAT_SCENE_STOP, handleCombatSceneStop);

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

    const unlock = () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      audioUnlocked = true;
      // Resume the audio context if suspended
      const ctx = (this.sound as Phaser.Sound.WebAudioSoundManager)?.context;
      if (ctx?.state === 'suspended') ctx.resume();
      requestAnimationFrame(() => {
        if (desiredTrack && !this.currentMusic) {
          this.playTrack(desiredTrack);
        }
      });
    };

    // Try immediate unlock (works if browser remembers prior interaction)
    const ctx = (this.sound as Phaser.Sound.WebAudioSoundManager)?.context;
    if (ctx && ctx.state === 'running') {
      audioUnlocked = true;
      requestAnimationFrame(() => {
        if (desiredTrack) this.playTrack(desiredTrack);
      });
    } else {
      // Fall back to any user gesture
      document.addEventListener('click', unlock);
      document.addEventListener('pointerdown', unlock);
      document.addEventListener('keydown', unlock);
    }

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
          // Music selection is deferred to COMBAT_MUSIC_SET, which fires once
          // the encounter enemies are known (so we can pick encounter-specific
          // tracks like the Outlaw King theme).
          break;
        }
        case 'merchant':
        case 'event':
          setTrack('shop_theme');
          break;
        case 'campfire':
        case 'artifact':
          // Keep map music
          break;
        case 'score':
          desiredTrack = '';
          if (audioUnlocked) this.fadeOut();
          break;
      }
    });

    // Explicit music fade-out (e.g. before async navigation)
    EventBus.on(GameEvent.MUSIC_FADE_OUT, () => {
      desiredTrack = '';
      if (audioUnlocked) this.fadeOut();
    });

    EventBus.on(GameEvent.DEADEYE_ACTIVATED, () => {
      if (audioUnlocked) this.duckForDeadeye();
    });

    EventBus.on(GameEvent.DEADEYE_ENDED, () => {
      if (audioUnlocked) this.restoreAfterDeadeye();
    });

    // Combat music is chosen once the encounter is known, so we can swap in
    // enemy-specific tracks (e.g. Outlaw King) instead of generic elite music.
    EventBus.on(GameEvent.COMBAT_MUSIC_SET, (...args: unknown[]) => {
      const payload = args[0] as {
        enemyTypes: string[];
        isElite: boolean;
        isBoss: boolean;
        act: number;
      };
      const setTrack = (track: string) => {
        desiredTrack = track;
        if (audioUnlocked) this.playTrack(track);
      };
      // Outlaw King's theme wins regardless of node type — he can appear in
      // late normal or elite encounters via the 1% spawn roll.
      const hasOutlawKing = payload.enemyTypes.some(
        (t) => t === 'outlaw_king' || t.startsWith('outlaw_king_'),
      );
      if (hasOutlawKing) {
        setTrack('outlaw_king_theme');
      } else if (payload.isBoss) {
        const bossThemes: Record<number, string> = {
          1: 'dustys_theme',
          2: 'copperheads_theme',
          3: 'ironeyes_theme',
        };
        setTrack(bossThemes[payload.act] ?? `act${payload.act}_theme`);
      } else if (payload.isElite) {
        setTrack(Math.random() < 0.5 ? 'elite_theme' : 'elite_theme_alt');
      } else {
        // Act themes: 3 variants each (1/3 chance)
        const r = Math.random();
        const suffix = r < 0.333 ? '' : r < 0.666 ? '_alt' : '_alt2';
        setTrack(`act${payload.act}_theme${suffix}`);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Unified music player
  // ---------------------------------------------------------------------------

  private safeSetVolume(sound: Phaser.Sound.BaseSound, vol: number): void {
    try {
      (sound as Phaser.Sound.WebAudioSound).setVolume(
        vol * this.musicDuckMultiplier * useSettingsStore.getState().musicVolume,
      );
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
    // Cancel any running fade and immediately clean up the sound it was fading
    if (this.fadeTween) {
      this.fadeTween.stop();
      this.fadeTween = null;
    }
    if (this.fadingOutSound) {
      try { this.fadingOutSound.stop(); } catch { /* ignore */ }
      try { this.fadingOutSound.destroy(); } catch { /* ignore */ }
      this.fadingOutSound = null;
    }
    this.musicDuckMultiplier = 1;
    this.deadeyeMusicDucking = false;

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

    this.fadingOutSound = music;
    const proxy = { vol: currentVol };
    this.fadeTween = this.tweens.add({
      targets: proxy,
      vol: 0,
      duration: 500,
      onUpdate: () => this.safeSetVolume(music, proxy.vol),
      onComplete: () => {
        this.fadeTween = null;
        this.fadingOutSound = null;
        try { music.stop(); } catch { /* ignore */ }
        try { music.destroy(); } catch { /* ignore */ }
        onComplete?.();
      },
    });
  }

  /** Fade the current music down while Deadeye is active. */
  private duckForDeadeye(): void {
    const music = this.currentMusic;
    if (!music || this.deadeyeMusicDucking) return;

    if (this.fadeTween) {
      this.fadeTween.stop();
      this.fadeTween = null;
    }
    if (this.fadingOutSound) {
      try { this.fadingOutSound.stop(); } catch { /* ignore */ }
      try { this.fadingOutSound.destroy(); } catch { /* ignore */ }
      this.fadingOutSound = null;
    }

    this.deadeyeMusicDucking = true;
    this.musicDuckMultiplier = 1;
    let currentVol: number;
    try {
      const settingsVolume = useSettingsStore.getState().musicVolume || 1;
      currentVol = ((music as Phaser.Sound.WebAudioSound).volume ?? this.targetVolume) / settingsVolume;
    } catch {
      currentVol = this.targetVolume;
    }

    const proxy = { vol: currentVol };
    this.fadeTween = this.tweens.add({
      targets: proxy,
      vol: this.targetVolume * 0.5,
      duration: 350,
      onUpdate: () => this.safeSetVolume(music, proxy.vol),
      onComplete: () => {
        this.fadeTween = null;
        if (!this.deadeyeMusicDucking) return;
        this.musicDuckMultiplier = 0.5;
        this.safeSetVolume(music, this.targetVolume);
      },
    });
  }

  /** Restore full music volume after Deadeye. */
  private restoreAfterDeadeye(): void {
    const music = this.currentMusic;
    if (!music || !this.deadeyeMusicDucking) return;

    if (this.fadeTween) {
      this.fadeTween.stop();
      this.fadeTween = null;
    }

    let currentVol: number;
    try {
      const settingsVolume = useSettingsStore.getState().musicVolume || 1;
      currentVol = ((music as Phaser.Sound.WebAudioSound).volume ?? this.targetVolume) / settingsVolume;
    } catch {
      currentVol = this.targetVolume * 0.5;
    }

    this.deadeyeMusicDucking = false;
    this.musicDuckMultiplier = 1;
    const proxy = { vol: currentVol };
    this.fadeTween = this.tweens.add({
      targets: proxy,
      vol: this.targetVolume,
      duration: 350,
      onUpdate: () => this.safeSetVolume(music, proxy.vol),
      onComplete: () => {
        this.fadeTween = null;
      },
    });
  }
}
