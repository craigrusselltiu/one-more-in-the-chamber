import Phaser from 'phaser';

export type ShakeIntensity = 'light' | 'medium' | 'heavy';

interface ShakeConfig {
  /** Maximum pixel offset (integer). */
  amplitude: number;
  /** Duration in milliseconds. */
  duration: number;
}

const SHAKE_PRESETS: Record<ShakeIntensity, ShakeConfig> = {
  light:  { amplitude: 1, duration: 100 },
  medium: { amplitude: 2, duration: 150 },
  heavy:  { amplitude: 4, duration: 250 },
};

/**
 * ScreenShake: pixel-perfect camera shake for combat juice.
 *
 * Offsets are always integers to respect the 480x270 pixel-art rendering.
 * Multiple shakes override the current one (strongest wins).
 */
export class ScreenShake {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private timer: Phaser.Time.TimerEvent | null = null;
  private elapsed = 0;
  private amplitude = 0;
  private duration = 0;
  private enabled = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
  }

  /** Toggle screen shake on/off (accessibility). */
  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.stop();
  }

  /** Trigger a shake with a named intensity preset. */
  shake(intensity: ShakeIntensity): void {
    if (!this.enabled) return;

    const config = SHAKE_PRESETS[intensity];

    // If a shake is already running, only override if the new one is stronger
    if (this.timer && config.amplitude < this.amplitude) return;

    this.stop();
    this.amplitude = config.amplitude;
    this.duration = config.duration;
    this.elapsed = 0;

    this.timer = this.scene.time.addEvent({
      delay: 16, // ~60fps tick
      callback: this.tick,
      callbackScope: this,
      loop: true,
    });
  }

  private tick(): void {
    this.elapsed += 16;

    if (this.elapsed >= this.duration) {
      this.stop();
      return;
    }

    // Decay amplitude linearly over duration
    const progress = this.elapsed / this.duration;
    const currentAmp = Math.max(1, Math.round(this.amplitude * (1 - progress)));

    // Random integer offsets in [-currentAmp, currentAmp]
    const ox = Math.round((Math.random() * 2 - 1) * currentAmp);
    const oy = Math.round((Math.random() * 2 - 1) * currentAmp);

    this.camera.setScroll(ox, oy);
  }

  private stop(): void {
    if (this.timer) {
      this.timer.destroy();
      this.timer = null;
    }
    this.elapsed = 0;
    this.amplitude = 0;
    this.duration = 0;
    this.camera.setScroll(0, 0);
  }

  destroy(): void {
    this.stop();
  }
}
