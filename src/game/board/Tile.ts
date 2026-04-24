import Phaser from 'phaser';
import type { TileType } from '../../types/game';
import type { TileHazardState } from '../../types/tiles';
import { TILE_FRAMES, HAZARD_FRAMES } from '../../data/spriteConfig';
import { EventBus, GameEvent } from '../EventBus';
import { useSettingsStore, getSpeedMultiplier } from '../../store/settingsStore';

/** Grid spacing. Larger than sprite (48px at 3x) to leave room for VFX outlines. */
export const TILE_SIZE = 54;
const STATUS_OFFSET = 18;

export interface TileEffectFrame {
  breath: number;
  sandBreath: number;
  slowBreath: number;
  showdownTint: number;
}

/**
 * Tile: sprite + state for a single board cell.
 * Renders a 16x16 frame from the sprite sheet at 3x scale (48x48).
 * The 960x540 canvas maps 1:1 to screen pixels.
 *
 * Effect overlays:
 *   - Showdown tile: rainbow breathing overlay
 *   - Explosive (4-match special tile): orange breathing overlay
 *   - Bomb hazard: red breathing overlay + countdown number
 */
export class Tile {
  readonly scene: Phaser.Scene;
  type: TileType;
  row: number;
  col: number;
  isExplosive = false;
  isShowdown = false;
  isShadow = false;
  /** Timestamp when the hint effect expires. 0 = no hint. */
  hintUntil = 0;
  private hintStart = 0;

  private _hazard: TileHazardState | null = null;
  private sprite: Phaser.GameObjects.Image;
  private highlight: Phaser.GameObjects.Rectangle | null = null;
  /** Tinted sprite copy that only covers non-transparent pixels. */
  private overlay: Phaser.GameObjects.Image | null = null;
  /** Offset sprite copies forming a thick outline with VFX. */
  private outlineSprites: Phaser.GameObjects.Image[] = [];
  /** Countdown label for bomb hazards (centered on tile). */
  private bombLabel: Phaser.GameObjects.Text | null = null;
  /** Status indicators for non-bomb hazards. */
  private statusDot: Phaser.GameObjects.Rectangle | null = null;
  private statusLabel: Phaser.GameObjects.Text | null = null;
  /** Lock icon displayed on top of the sprite. */
  private lockIcon: Phaser.GameObjects.Image | null = null;
  private lockOutline: Phaser.GameObjects.Image[] = [];
  /** Poison icon displayed at bottom-right corner. */
  private poisonIcon: Phaser.GameObjects.Image | null = null;
  private destroyed = false;
  private _mask: Phaser.Display.Masks.GeometryMask | null = null;
  /** Breathing "?" label for buried (sand) tiles. */
  private sandLabel: Phaser.GameObjects.Text | null = null;
  /** Next time to emit shadow idle particles. */
  private nextShadowParticle = 0;
  private lastOverlayTint = -1;
  private lastOverlayAlpha = -1;
  private lastOutlineAlpha = -1;
  private effectActivity = false;
  private onEffectActivityChanged?: (tile: Tile, active: boolean) => void;

  get hazard(): TileHazardState | null {
    return this._hazard;
  }

  set hazard(val: TileHazardState | null) {
    const wasSand = this._hazard?.type === 'sand';
    this._hazard = val;
    const isSand = val?.type === 'sand';

    if (!this.destroyed) {
      // Sand: swap sprite to sand frame / restore real frame
      if (isSand && !wasSand) {
        this.sprite.setFrame(HAZARD_FRAMES.sand);
        if (this.overlay) this.overlay.setFrame(HAZARD_FRAMES.sand);
        for (const s of this.outlineSprites) s.setFrame(HAZARD_FRAMES.sand);
      } else if (!isSand && wasSand) {
        const realFrame = TILE_FRAMES[this.type];
        this.sprite.setFrame(realFrame);
        if (this.overlay) this.overlay.setFrame(realFrame);
        for (const s of this.outlineSprites) s.setFrame(realFrame);
        // Sand-colored particles on reveal
        EventBus.emit(GameEvent.TILE_PARTICLES, this.sprite.x, this.sprite.y, '#e8c170');
      }

      this.updateOverlay();
      this.updateStatusIndicator();
      this.notifyEffectActivityChanged();
    }
  }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: TileType,
    row: number,
    col: number,
    onEffectActivityChanged?: (tile: Tile, active: boolean) => void,
  ) {
    this.scene = scene;
    this.type = type;
    this.row = row;
    this.col = col;
    this.onEffectActivityChanged = onEffectActivityChanged;

    const cx = Math.round(x + TILE_SIZE / 2);
    const cy = Math.round(y + TILE_SIZE / 2);

    this.sprite = scene.add
      .image(cx, cy, 'items_sheet', TILE_FRAMES[type])
      .setScale(3);
  }

  setType(newType: TileType): void {
    this.type = newType;
    // Sand tiles keep the sand frame -- only update visuals for non-buried tiles
    if (this._hazard?.type !== 'sand') {
      const frame = TILE_FRAMES[this.type];
      this.sprite.setFrame(frame);
      if (this.overlay) this.overlay.setFrame(frame);
      for (const s of this.outlineSprites) s.setFrame(frame);
    }
    this.updateOverlay();
    this.notifyEffectActivityChanged();
  }

  setTint(color: number): void {
    this.sprite.setTint(color);
  }

  clearTint(): void {
    this.sprite.clearTint();
  }

  setMask(mask: Phaser.Display.Masks.GeometryMask): void {
    this._mask = mask;
    this.sprite.setMask(mask);
    if (this.overlay) this.overlay.setMask(mask);
    for (const s of this.outlineSprites) s.setMask(mask);
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

  setShadow(value: boolean): void {
    this.isShadow = value;
    this.updateOverlay();
  }

  refreshStatusIndicator(): void {
    if (!this.destroyed) {
      this.updateOverlay();
      this.updateStatusIndicator();
      this.notifyEffectActivityChanged();
    }
  }

  // ---------------------------------------------------------------------------
  // Animated overlay system
  // ---------------------------------------------------------------------------

  needsEffectUpdate(): boolean {
    return !this.destroyed && (!!this.sandLabel || !!this.overlay || this.hintUntil > 0 || this.isShadow);
  }

  private notifyEffectActivityChanged(): void {
    const active = this.needsEffectUpdate();
    if (active === this.effectActivity) return;
    this.effectActivity = active;
    this.onEffectActivityChanged?.(this, active);
  }

  /** Per-frame update called by Board.update(). Drives breathing animations. */
  updateEffects(time: number, frame: TileEffectFrame): void {
    if (this.destroyed) return;

    // Sand label breathing
    if (this.sandLabel) {
      this.sandLabel.setAlpha(0.5 + frame.sandBreath * 0.5);
    }

    if (!this.overlay) return;

    let tint = 0;
    let overlayAlpha = 0;
    let outlineAlpha = 0;

    if (this.isShowdown) {
      tint = frame.showdownTint;
      overlayAlpha = 0.2 + frame.breath * 0.25;
      outlineAlpha = 0.6 + frame.breath * 0.4;
    } else if (this.isShadow) {
      // Dark purple-to-black gradient: cycle between deep purple and near-black
      const r = Math.floor(0x30 + frame.slowBreath * 0x30); // 0x30..0x60
      const g = Math.floor(0x00 + frame.slowBreath * 0x10); // 0x00..0x10
      const b = Math.floor(0x40 + frame.slowBreath * 0x40); // 0x40..0x80
      tint = (r << 16) | (g << 8) | b;
      overlayAlpha = 0.25 + frame.breath * 0.2;
      outlineAlpha = 0.6 + frame.breath * 0.3;
    } else if (this._hazard?.type === 'suppress') {
      // Grey gradient: cycle between dark grey and near-black
      const v = Math.floor(0x30 + frame.slowBreath * 0x30); // 0x30..0x60
      tint = (v << 16) | (v << 8) | v;
      overlayAlpha = 0.25 + frame.breath * 0.2;
      outlineAlpha = 0.6 + frame.breath * 0.3;
    } else if (this.isExplosive) {
      tint = 0xff8800;
      overlayAlpha = 0.15 + frame.breath * 0.2;
      outlineAlpha = 0.5 + frame.breath * 0.4;
    } else if (this._hazard?.type === 'bomb') {
      tint = 0xff2020;
      overlayAlpha = 0.15 + frame.breath * 0.25;
      outlineAlpha = 0.5 + frame.breath * 0.4;
    } else if (this._hazard?.type === 'poison') {
      tint = 0x40ff40;
      overlayAlpha = 0.15 + frame.breath * 0.25;
      outlineAlpha = 0.5 + frame.breath * 0.4;
    } else if (this.hintUntil > 0 && time < this.hintUntil) {
      // Hint: 3 fade in/out pulses over the duration
      const duration = this.hintUntil - this.hintStart;
      const elapsed = time - this.hintStart;
      const progress = elapsed / duration;
      // 3 pulses: use a triangle wave over 3 cycles
      const pulse = progress * 3; // 0→3
      const frac = pulse - Math.floor(pulse); // 0→1 within each pulse
      const triangle = frac < 0.5 ? frac * 2 : (1 - frac) * 2; // 0→1→0
      tint = 0xffffff;
      overlayAlpha = 0.25 * triangle;
      outlineAlpha = 0.7 * triangle;
    }

    // Shadow idle particles: emit dark purple wisps periodically
    if (this.isShadow && time > this.nextShadowParticle) {
      this.nextShadowParticle = time + 800 + Math.random() * 400;
      EventBus.emit(GameEvent.TILE_PARTICLES, this.sprite.x, this.sprite.y, '#6b2fa0');
    }

    if (this.hintUntil > 0 && time >= this.hintUntil) {
      this.hintUntil = 0;
      if (!this.isShowdown && !this.isExplosive && !this.isShadow && this._hazard?.type !== 'bomb' && this._hazard?.type !== 'poison' && this._hazard?.type !== 'suppress') {
        this.destroyOverlay();
        this.destroyOutline();
      }
      this.notifyEffectActivityChanged();
    }

    if (tint) {
      this.applyOverlayVisual(tint, overlayAlpha, outlineAlpha);
    }
  }

  private applyOverlayVisual(tint: number, overlayAlpha: number, outlineAlpha: number): void {
    if (!this.overlay) return;

    const roundedOverlayAlpha = Math.round(overlayAlpha * 100) / 100;
    const roundedOutlineAlpha = Math.round(outlineAlpha * 100) / 100;

    if (this.lastOverlayTint !== tint) {
      this.overlay.setTintFill(tint);
      for (const s of this.outlineSprites) s.setTintFill(tint);
      this.lastOverlayTint = tint;
    }
    if (this.lastOverlayAlpha !== roundedOverlayAlpha) {
      this.overlay.setAlpha(roundedOverlayAlpha);
      this.lastOverlayAlpha = roundedOverlayAlpha;
    }
    if (this.lastOutlineAlpha !== roundedOutlineAlpha) {
      for (const s of this.outlineSprites) s.setAlpha(roundedOutlineAlpha);
      this.lastOutlineAlpha = roundedOutlineAlpha;
    }
  }

  private resetOverlayVisualCache(): void {
    this.lastOverlayTint = -1;
    this.lastOverlayAlpha = -1;
    this.lastOutlineAlpha = -1;
  }

  private static readonly OUTLINE_OFFSETS: [number, number][] = [
    [0, -3],
    [-3, 0], [3, 0],
    [0, 3],
  ];

  /** Start a hint effect that lasts for `durationMs` milliseconds. */
  startHint(durationMs: number): void {
    this.hintStart = this.scene.time.now;
    this.hintUntil = this.hintStart + durationMs;
    // Ensure overlay + outline exist for the hint effect
    if (!this.overlay || this.outlineSprites.length === 0) {
      this.updateOverlay();
    }
    this.notifyEffectActivityChanged();
  }

  private updateOverlay(): void {
    const needsOverlay = this.isShowdown || this.isExplosive || this.isShadow || this._hazard?.type === 'bomb' || this._hazard?.type === 'poison' || this._hazard?.type === 'suppress' || this.hintUntil > 0;
    const cx = this.sprite.x;
    const cy = this.sprite.y;
    // Buried (sand) tiles: outline/overlay uses the sand sprite so hints don't spoil the hidden icon.
    const frame = this._hazard?.type === 'sand' ? HAZARD_FRAMES.sand : TILE_FRAMES[this.type];

    if (needsOverlay) {
      if (!this.overlay) {
        // Duplicate the sprite as a tinted overlay - only covers non-transparent pixels
        this.overlay = this.scene.add
          .image(cx, cy, 'items_sheet', frame)
          .setScale(3)
          .setDepth(1)
          .setAlpha(0);
        if (this._mask) this.overlay.setMask(this._mask);
        this.resetOverlayVisualCache();
      } else {
        this.overlay.setPosition(cx, cy);
        this.overlay.setFrame(frame);
      }

      // Create outline sprites (offset copies rendered behind the main sprite)
      if (this.outlineSprites.length === 0) {
        for (const [dx, dy] of Tile.OUTLINE_OFFSETS) {
          const s = this.scene.add
            .image(cx + dx, cy + dy, 'items_sheet', frame)
            .setScale(3)
            .setDepth(-1)
            .setAlpha(0);
          if (this._mask) s.setMask(this._mask);
          this.outlineSprites.push(s);
        }
        this.resetOverlayVisualCache();
      } else {
        for (let i = 0; i < this.outlineSprites.length; i++) {
          const [dx, dy] = Tile.OUTLINE_OFFSETS[i];
          this.outlineSprites[i].setPosition(cx + dx, cy + dy);
          this.outlineSprites[i].setFrame(frame);
        }
      }
    } else {
      this.destroyOverlay();
      this.destroyOutline();
    }
    this.notifyEffectActivityChanged();

    // Bomb hazard: centered countdown number
    if (this._hazard?.type === 'bomb') {
      const countdown = String(this._hazard.countdown);
      if (!this.bombLabel) {
        this.bombLabel = this.scene.add
          .text(cx, cy, countdown, {
            fontSize: '21px',
            fontFamily: 'Inter, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
          .setDepth(2)
          .setStroke('#000000', 6);
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
      this.resetOverlayVisualCache();
      this.notifyEffectActivityChanged();
    }
  }

  private destroyOutline(): void {
    for (const s of this.outlineSprites) s.destroy();
    this.outlineSprites.length = 0;
    this.resetOverlayVisualCache();
    this.notifyEffectActivityChanged();
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

    // No hazard or types handled elsewhere: clean up
    if (this._hazard === null || this._hazard.type === 'fools_gold' || this._hazard.type === 'bomb') {
      this.destroyStatusIndicator();
      this.destroyLockIcon();
      this.destroyPoisonIcon();
      this.destroySandLabel();
      this.sprite.clearTint();
      if (this.sprite.preFX) this.sprite.preFX.clear();
      return;
    }

    // Suppress: dark tint + overlay/outline breathing in updateOverlay()
    if (this._hazard.type === 'suppress') {
      this.destroyStatusIndicator();
      this.destroyLockIcon();
      this.destroyPoisonIcon();
      this.destroySandLabel();
      if (this.sprite.preFX) this.sprite.preFX.clear();
      this.sprite.setTint(0x666666);
      return;
    }

    // Lock: grey out sprite + lock icon centered on tile
    if (this._hazard.type === 'lock') {
      this.destroyStatusIndicator();
      this.destroyPoisonIcon();
      this.sprite.setTint(0x666666);

      if (!this.lockIcon) {
        const frame = HAZARD_FRAMES.lock;
        for (const [dx, dy] of Tile.OUTLINE_OFFSETS) {
          const s = this.scene.add
            .image(cx + dx, cy + dy, 'items_sheet', frame)
            .setScale(2)
            .setDepth(2)
            .setTintFill(0x000000)
            .setAlpha(0.8);
          this.lockOutline.push(s);
        }
        this.lockIcon = this.scene.add
          .image(cx, cy, 'items_sheet', frame)
          .setScale(2)
          .setDepth(3);
      } else {
        this.lockIcon.setPosition(cx, cy);
        for (let i = 0; i < this.lockOutline.length; i++) {
          const [dx, dy] = Tile.OUTLINE_OFFSETS[i];
          this.lockOutline[i].setPosition(cx + dx, cy + dy);
        }
      }

      // Show hit count below the icon when hits > 1
      if (this._hazard.hits > 1) {
        const text = String(this._hazard.hits);
        if (!this.statusLabel) {
          this.statusLabel = this.scene.add
            .text(cx, Math.round(cy + 15), text, {
              fontSize: '12px',
              color: '#ffffff',
              fontFamily: 'Inter, sans-serif',
              fontStyle: 'bold',
            })
            .setOrigin(0.5)
            .setDepth(4)
            .setStroke('#000000', 5);
        } else {
          this.statusLabel.setPosition(cx, Math.round(cy + 15));
          this.statusLabel.setText(text);
        }
      } else {
        if (this.statusLabel) { this.statusLabel.destroy(); this.statusLabel = null; }
      }
      return;
    }

    // Poison: overlay effect only (no icon)
    if (this._hazard.type === 'poison') {
      this.destroyStatusIndicator();
      this.destroyLockIcon();
      this.destroyPoisonIcon();
      this.sprite.clearTint();
      return;
    }

    // Sand (bury): centered breathing "?" with black outline
    if (this._hazard.type === 'sand') {
      this.destroyLockIcon();
      this.destroyPoisonIcon();
      this.destroyStatusIndicator();
      this.sprite.clearTint();

      if (!this.sandLabel) {
        this.sandLabel = this.scene.add
          .text(cx, cy, '?', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Inter, sans-serif',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
          .setDepth(4)
          .setStroke('#000000', 6);
      } else {
        this.sandLabel.setPosition(cx, cy);
      }
      return;
    }

    // Other hazards: corner dot + text
    this.destroySandLabel();
    this.destroyLockIcon();
    this.destroyPoisonIcon();
    this.sprite.clearTint();

    const { dotColor, text } = this.hazardStyle(this._hazard);

    if (!this.statusDot) {
      this.statusDot = this.scene.add
        .rectangle(ix, iy, 15, 15, dotColor, 1)
        .setDepth(1);
    } else {
      this.statusDot.setPosition(ix, iy);
      this.statusDot.setFillStyle(dotColor, 1);
    }

    if (!this.statusLabel) {
      this.statusLabel = this.scene.add
        .text(ix, iy, text, {
          fontSize: '10px',
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
      case 'sand':           return { dotColor: 0xe8c170, text: '?' };
      default:               return { dotColor: 0xaaaaaa, text: '' };
    }
  }

  private destroyLockIcon(): void {
    for (const s of this.lockOutline) s.destroy();
    this.lockOutline.length = 0;
    if (this.lockIcon) {
      this.lockIcon.destroy();
      this.lockIcon = null;
    }
  }

  private destroyPoisonIcon(): void {
    if (this.poisonIcon) {
      this.poisonIcon.destroy();
      this.poisonIcon = null;
    }
  }

  private destroySandLabel(): void {
    if (this.sandLabel) {
      this.sandLabel.destroy();
      this.sandLabel = null;
      this.notifyEffectActivityChanged();
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
    for (let i = 0; i < this.outlineSprites.length; i++) {
      const [dx, dy] = Tile.OUTLINE_OFFSETS[i];
      this.outlineSprites[i].setPosition(cx + dx, cy + dy);
    }
    if (this.bombLabel) this.bombLabel.setPosition(cx, cy);
    if (this.highlight) this.highlight.setPosition(cx, cy);
    if (this.statusDot) {
      this.statusDot.setPosition(Math.round(cx + STATUS_OFFSET), Math.round(cy + STATUS_OFFSET));
    }
    if (this.statusLabel) {
      const labelY = this.lockIcon ? Math.round(cy + 15) : Math.round(cy + STATUS_OFFSET);
      this.statusLabel.setPosition(Math.round(cx + STATUS_OFFSET), labelY);
    }
    if (this.lockIcon) this.lockIcon.setPosition(cx, cy);
    if (this.poisonIcon) this.poisonIcon.setPosition(Math.round(cx + STATUS_OFFSET), Math.round(cy + STATUS_OFFSET));
    if (this.sandLabel) this.sandLabel.setPosition(cx, cy);
  }

  setSelected(selected: boolean): void {
    if (selected && !this.highlight) {
      this.highlight = this.scene.add
        .rectangle(Math.round(this.sprite.x), Math.round(this.sprite.y), TILE_SIZE, TILE_SIZE)
        .setStrokeStyle(3, 0xffffff)
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
      // Main targets tween to center of the new cell
      const targets: Phaser.GameObjects.GameObject[] = [this.sprite];
      if (this.overlay) targets.push(this.overlay);
      if (this.highlight) targets.push(this.highlight);
      if (this.bombLabel) targets.push(this.bombLabel);
      if (this.lockIcon) targets.push(this.lockIcon);
      if (this.sandLabel) targets.push(this.sandLabel);

      const offsetTargets: Array<{ target: Phaser.GameObjects.Components.Transform; dx: number; dy: number }> = [];
      const lockOutlineOffsets = Tile.OUTLINE_OFFSETS;
      for (let i = 0; i < this.lockOutline.length; i++) {
        const [dx, dy] = lockOutlineOffsets[i];
        offsetTargets.push({ target: this.lockOutline[i], dx, dy });
      }
      for (let i = 0; i < this.outlineSprites.length; i++) {
        const [dx, dy] = Tile.OUTLINE_OFFSETS[i];
        offsetTargets.push({ target: this.outlineSprites[i], dx, dy });
      }
      if (this.statusDot) offsetTargets.push({ target: this.statusDot, dx: STATUS_OFFSET, dy: STATUS_OFFSET });
      if (this.statusLabel && !this.lockIcon) offsetTargets.push({ target: this.statusLabel, dx: STATUS_OFFSET, dy: STATUS_OFFSET });
      if (this.poisonIcon) offsetTargets.push({ target: this.poisonIcon, dx: STATUS_OFFSET, dy: STATUS_OFFSET });
      if (this.statusLabel && this.lockIcon) offsetTargets.push({ target: this.statusLabel, dx: 0, dy: 15 });

      if (offsetTargets.length > 0) {
        const offsetProxy = { x: this.sprite.x, y: this.sprite.y };
        const updateOffsetTargets = () => {
          const cx = Math.round(offsetProxy.x);
          const cy = Math.round(offsetProxy.y);
          for (const { target, dx, dy } of offsetTargets) {
            target.setPosition(Math.round(cx + dx), Math.round(cy + dy));
          }
        };

        this.scene.tweens.add({
          targets: offsetProxy,
          x: targetX,
          y: targetY,
          duration,
          delay,
          ease,
          onUpdate: updateOffsetTargets,
          onComplete: updateOffsetTargets,
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

  /** Scale all visuals of this tile. Used for shuffle animation. */
  tweenScale(scale: number, duration: number): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    duration = Math.round(duration / getSpeedMultiplier());
    if (!useSettingsStore.getState().juiceAnimationsEnabled) return Promise.resolve();

    // Main sprites at scale 3
    const mainTargets: Phaser.GameObjects.GameObject[] = [this.sprite];
    if (this.overlay) mainTargets.push(this.overlay);
    mainTargets.push(...this.outlineSprites);

    // Lock at scale 2
    const lockTargets: Phaser.GameObjects.GameObject[] = [...this.lockOutline];
    if (this.lockIcon) lockTargets.push(this.lockIcon);

    // Text/shape elements at scale 1
    const smallTargets: Phaser.GameObjects.GameObject[] = [];
    if (this.bombLabel) smallTargets.push(this.bombLabel);
    if (this.statusDot) smallTargets.push(this.statusDot);
    if (this.statusLabel) smallTargets.push(this.statusLabel);
    if (this.poisonIcon) smallTargets.push(this.poisonIcon);
    if (this.sandLabel) smallTargets.push(this.sandLabel);

    return new Promise((resolve) => {
      if (lockTargets.length > 0) {
        this.scene.tweens.add({
          targets: lockTargets,
          scaleX: scale * 2,
          scaleY: scale * 2,
          duration,
          ease: 'Cubic.easeInOut',
        });
      }
      if (smallTargets.length > 0) {
        this.scene.tweens.add({
          targets: smallTargets,
          scaleX: scale,
          scaleY: scale,
          duration,
          ease: 'Cubic.easeInOut',
        });
      }
      this.scene.tweens.add({
        targets: mainTargets,
        scaleX: scale * 3,
        scaleY: scale * 3,
        duration,
        ease: 'Cubic.easeInOut',
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
      targets.push(...this.outlineSprites);
      targets.push(...this.lockOutline);
      if (this.bombLabel) targets.push(this.bombLabel);
      if (this.highlight) targets.push(this.highlight);
      if (this.statusDot) targets.push(this.statusDot);
      if (this.statusLabel) targets.push(this.statusLabel);
      if (this.lockIcon) targets.push(this.lockIcon);
      if (this.poisonIcon) targets.push(this.poisonIcon);
      if (this.sandLabel) targets.push(this.sandLabel);

      const popDuration = Math.round(duration * 0.3);
      const fadeDuration = Math.round(duration * 0.7);

      // Phase 1: quick pop-up scale
      this.scene.tweens.add({
        targets,
        scaleX: '+=0.9',
        scaleY: '+=0.9',
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
    this.destroyOutline();
    this.destroyBombLabel();
    if (this.highlight) {
      this.highlight.destroy();
      this.highlight = null;
    }
    this.destroyStatusIndicator();
    this.destroyLockIcon();
    this.destroyPoisonIcon();
    this.destroySandLabel();
    this.notifyEffectActivityChanged();
  }
}
