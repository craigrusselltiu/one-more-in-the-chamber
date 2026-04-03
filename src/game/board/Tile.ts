import Phaser from 'phaser';
import type { TileType } from '../../types/game';
import type { TileHazardState } from '../../types/tiles';
import { TILE_FRAMES } from '../../data/spriteConfig';
import { useSettingsStore, getSpeedMultiplier } from '../../store/settingsStore';

/** Grid spacing = sprite size (2x of 16px source). No overlap. */
export const TILE_SIZE = 32;
const STATUS_OFFSET = 12;

/**
 * Tile: sprite + state for a single board cell.
 * Renders a 16x16 frame from the sprite sheet at 2x scale (32x32).
 *
 * Effect overlays:
 *   - Showdown tile: rainbow breathing overlay
 *   - Explosive (4-match bomb): yellow breathing overlay
 *   - Bomb hazard: red breathing overlay + countdown number
 */
export class Tile {
  readonly scene: Phaser.Scene;
  type: TileType;
  row: number;
  col: number;
  isExplosive = false;
  isShowdown = false;

  private _hazard: TileHazardState | null = null;
  private sprite: Phaser.GameObjects.Image;
  private highlight: Phaser.GameObjects.Rectangle | null = null;
  /** Animated color overlay for special tiles and bomb hazards. */
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  /** Countdown label for bomb hazards (centered on tile). */
  private bombLabel: Phaser.GameObjects.Text | null = null;
  /** Status indicators for non-bomb hazards. */
  private statusDot: Phaser.GameObjects.Rectangle | null = null;
  private statusLabel: Phaser.GameObjects.Text | null = null;
  private destroyed = false;

  get hazard(): TileHazardState | null {
    return this._hazard;
  }

  set hazard(val: TileHazardState | null) {
    this._hazard = val;
    if (!this.destroyed) {
      this.updateOverlay();
      this.updateStatusIndicator();
    }
  }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: TileType,
    row: number,
    col: number,
  ) {
    this.scene = scene;
    this.type = type;
    this.row = row;
    this.col = col;

    const cx = Math.round(x + TILE_SIZE / 2);
    const cy = Math.round(y + TILE_SIZE / 2);

    this.sprite = scene.add
      .image(cx, cy, 'items_sheet', TILE_FRAMES[type])
      .setScale(2);
  }

  setType(newType: TileType): void {
    this.type = newType;
    this.sprite.setFrame(TILE_FRAMES[this.type]);
    this.updateOverlay();
  }

  setExplosive(value: boolean): void {
    this.isExplosive = value;
    this.isShowdown = false;
    this.updateOverlay();
  }

  setShowdown(value: boolean): void {
    this.isShowdown = value;
    this.isExplosive = false;
    this.updateOverlay();
  }

  refreshStatusIndicator(): void {
    if (!this.destroyed) {
      this.updateOverlay();
      this.updateStatusIndicator();
    }
  }

  // ---------------------------------------------------------------------------
  // Animated overlay system
  // ---------------------------------------------------------------------------

  /** Per-frame update called by Board.update(). Drives breathing animations. */
  updateEffects(time: number): void {
    if (this.destroyed || !this.overlay) return;

    const breath = 0.5 + 0.5 * Math.sin(time / 400);

    if (this.isShowdownEffect) {
      // Rainbow: cycle hue over time
      const hue = (time / 20) % 360;
      const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.8, 0.5);
      this.overlay.setFillStyle(color.color, 0.15 + breath * 0.2);
    } else if (this.isExplosive) {
      // Yellow breathing
      this.overlay.setFillStyle(0xffff00, 0.1 + breath * 0.15);
    } else if (this._hazard?.type === 'bomb') {
      // Red breathing
      this.overlay.setFillStyle(0xff0000, 0.1 + breath * 0.2);
    }
  }

  /** Whether this tile should show a showdown effect (either by flag or type). */
  private get isShowdownEffect(): boolean {
    return this.isShowdown || this.type === 'showdown';
  }

  private updateOverlay(): void {
    const needsOverlay = this.isShowdownEffect || this.isExplosive || this._hazard?.type === 'bomb';
    const cx = this.sprite.x;
    const cy = this.sprite.y;

    if (needsOverlay) {
      if (!this.overlay) {
        this.overlay = this.scene.add
          .rectangle(cx, cy, TILE_SIZE, TILE_SIZE, 0x000000, 0)
          .setDepth(1);
      } else {
        this.overlay.setPosition(cx, cy);
      }
    } else {
      this.destroyOverlay();
    }

    // Bomb hazard: centered countdown number
    if (this._hazard?.type === 'bomb') {
      const countdown = String(this._hazard.countdown);
      if (!this.bombLabel) {
        this.bombLabel = this.scene.add
          .text(cx, cy, countdown, {
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
          .setDepth(2)
          .setStroke('#000000', 4);
      } else {
        this.bombLabel.setPosition(cx, cy);
        this.bombLabel.setText(countdown);
      }
    } else {
      this.destroyBombLabel();
    }
  }

  private destroyOverlay(): void {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
  }

  private destroyBombLabel(): void {
    if (this.bombLabel) {
      this.bombLabel.destroy();
      this.bombLabel = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Non-bomb hazard indicators (lock, poison, sand, etc.)
  // ---------------------------------------------------------------------------

  private updateStatusIndicator(): void {
    const cx = this.sprite.x;
    const cy = this.sprite.y;
    const ix = Math.round(cx + STATUS_OFFSET);
    const iy = Math.round(cy + STATUS_OFFSET);

    // Bomb hazards use the overlay + centered label, not the corner indicator
    if (this._hazard === null || this._hazard.type === 'fools_gold' || this._hazard.type === 'bomb') {
      this.destroyStatusIndicator();
      return;
    }

    const { dotColor, text } = this.hazardStyle(this._hazard);

    if (!this.statusDot) {
      this.statusDot = this.scene.add
        .rectangle(ix, iy, 10, 10, dotColor, 1)
        .setDepth(1);
    } else {
      this.statusDot.setPosition(ix, iy);
      this.statusDot.setFillStyle(dotColor, 1);
    }

    if (!this.statusLabel) {
      this.statusLabel = this.scene.add
        .text(ix, iy, text, {
          fontSize: '7px',
          color: '#000000',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5)
        .setDepth(2);
    } else {
      this.statusLabel.setPosition(ix, iy);
      this.statusLabel.setText(text);
    }
  }

  private hazardStyle(hazard: TileHazardState): { dotColor: number; text: string } {
    switch (hazard.type) {
      case 'lock':           return { dotColor: 0xaaaaaa, text: 'L' };
      case 'hardened_lock':  return { dotColor: 0x666666, text: String(hazard.hits) };
      case 'poison':         return { dotColor: 0x40d840, text: 'P' };
      case 'bomb':           return { dotColor: 0xff4040, text: '' }; // handled by overlay
      case 'sand':           return { dotColor: 0xe8c170, text: '?' };
      case 'fools_gold':     return { dotColor: 0xffd700, text: '' };
    }
  }

  private destroyStatusIndicator(): void {
    if (this.statusDot) {
      this.statusDot.destroy();
      this.statusDot = null;
    }
    if (this.statusLabel) {
      this.statusLabel.destroy();
      this.statusLabel = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Position / selection
  // ---------------------------------------------------------------------------

  setPosition(x: number, y: number): void {
    const cx = Math.round(x + TILE_SIZE / 2);
    const cy = Math.round(y + TILE_SIZE / 2);
    this.sprite.setPosition(cx, cy);
    if (this.overlay) this.overlay.setPosition(cx, cy);
    if (this.bombLabel) this.bombLabel.setPosition(cx, cy);
    if (this.highlight) this.highlight.setPosition(cx, cy);
    if (this.statusDot) {
      this.statusDot.setPosition(Math.round(cx + STATUS_OFFSET), Math.round(cy + STATUS_OFFSET));
    }
    if (this.statusLabel) {
      this.statusLabel.setPosition(Math.round(cx + STATUS_OFFSET), Math.round(cy + STATUS_OFFSET));
    }
  }

  setSelected(selected: boolean): void {
    if (selected && !this.highlight) {
      this.highlight = this.scene.add
        .rectangle(Math.round(this.sprite.x), Math.round(this.sprite.y), TILE_SIZE, TILE_SIZE)
        .setStrokeStyle(2, 0xffffff)
        .setFillStyle(0xffffff, 0.15);
    } else if (!selected && this.highlight) {
      this.highlight.destroy();
      this.highlight = null;
    }
  }

  getWorldCenter(): { x: number; y: number } {
    return { x: Math.round(this.sprite.x), y: Math.round(this.sprite.y) };
  }

  // ---------------------------------------------------------------------------
  // Animation methods
  // ---------------------------------------------------------------------------

  tweenToPosition(x: number, y: number, duration: number, delay = 0, bounce = false): Promise<void> {
    if (this.destroyed) return Promise.resolve();

    const targetX = Math.round(x + TILE_SIZE / 2);
    const targetY = Math.round(y + TILE_SIZE / 2);
    const speed = getSpeedMultiplier();

    if (!useSettingsStore.getState().juiceAnimationsEnabled) {
      this.setPosition(x, y);
      return Promise.resolve();
    }

    duration = Math.round(duration / speed);
    delay = Math.round(delay / speed);

    const ease = bounce ? 'Bounce.easeOut' : 'Cubic.easeIn';

    return new Promise((resolve) => {
      const targets: Phaser.GameObjects.GameObject[] = [this.sprite];
      if (this.overlay) targets.push(this.overlay);
      if (this.highlight) targets.push(this.highlight);
      if (this.bombLabel) targets.push(this.bombLabel);

      if (this.statusDot) {
        this.scene.tweens.add({
          targets: this.statusDot,
          x: Math.round(targetX + STATUS_OFFSET),
          y: Math.round(targetY + STATUS_OFFSET),
          duration,
          delay,
          ease,
        });
      }
      if (this.statusLabel) {
        this.scene.tweens.add({
          targets: this.statusLabel,
          x: Math.round(targetX + STATUS_OFFSET),
          y: Math.round(targetY + STATUS_OFFSET),
          duration,
          delay,
          ease,
        });
      }

      this.scene.tweens.add({
        targets,
        x: targetX,
        y: targetY,
        duration,
        delay,
        ease,
        onComplete: () => resolve(),
      });
    });
  }

  animateClear(duration: number): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    duration = Math.round(duration / getSpeedMultiplier());

    if (!useSettingsStore.getState().juiceAnimationsEnabled) {
      this.destroy();
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const targets: Phaser.GameObjects.GameObject[] = [this.sprite];
      if (this.overlay) targets.push(this.overlay);
      if (this.bombLabel) targets.push(this.bombLabel);
      if (this.highlight) targets.push(this.highlight);
      if (this.statusDot) targets.push(this.statusDot);
      if (this.statusLabel) targets.push(this.statusLabel);

      const popDuration = Math.round(duration * 0.3);
      const fadeDuration = Math.round(duration * 0.7);

      // Phase 1: quick pop-up scale
      this.scene.tweens.add({
        targets,
        scaleX: '+=0.6',
        scaleY: '+=0.6',
        duration: popDuration,
        ease: 'Quad.easeOut',
        onComplete: () => {
          // Phase 2: shrink + fade
          this.scene.tweens.add({
            targets,
            alpha: 0,
            scaleX: 0,
            scaleY: 0,
            duration: fadeDuration,
            ease: 'Power2',
            onComplete: () => {
              this.destroy();
              resolve();
            },
          });
        },
      });
    });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.sprite.destroy();
    this.destroyOverlay();
    this.destroyBombLabel();
    if (this.highlight) {
      this.highlight.destroy();
      this.highlight = null;
    }
    this.destroyStatusIndicator();
  }
}
