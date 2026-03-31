import Phaser from 'phaser';
import type { TileType } from '../../types/game';
import type { TileHazardState } from '../../types/tiles';
import { TILE_COLORS } from '../../data/tiles';

export const TILE_SIZE = 32;
const TILE_INNER = 30;

/**
 * Tile: sprite + state for a single board cell.
 * MVP: rendered as colored rectangle with text label.
 */
export class Tile {
  readonly scene: Phaser.Scene;
  type: TileType;
  row: number;
  col: number;
  isExplosive = false;
  isShowdown = false;

  private _hazard: TileHazardState | null = null;
  private rect: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private highlight: Phaser.GameObjects.Rectangle | null = null;
  private statusDot: Phaser.GameObjects.Rectangle | null = null;
  private statusLabel: Phaser.GameObjects.Text | null = null;

  get hazard(): TileHazardState | null {
    return this._hazard;
  }

  set hazard(val: TileHazardState | null) {
    this._hazard = val;
    this.updateStatusIndicator();
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

    const color = Phaser.Display.Color.HexStringToColor(
      TILE_COLORS[type] ?? '#808080',
    ).color;

    this.rect = scene.add
      .rectangle(
        Math.round(x + TILE_SIZE / 2),
        Math.round(y + TILE_SIZE / 2),
        TILE_INNER,
        TILE_INNER,
        color,
        0.2,
      )
      .setStrokeStyle(1, color);

    this.label = scene.add
      .text(
        Math.round(x + TILE_SIZE / 2),
        Math.round(y + TILE_SIZE / 2),
        this.abbreviation(),
        {
          fontSize: '10px',
          color: '#ffffff',
          fontFamily: 'monospace',
        },
      )
      .setOrigin(0.5);
  }

  private abbreviation(): string {
    const abbrevs: Record<TileType, string> = {
      bullet: 'Bu',
      iron: 'Ir',
      gold: 'Go',
      ricochet: 'Ri',
      smoke: 'Sm',
      dynamite: 'Dy',
      stampede: 'St',
      whiskey: 'Wh',
      buckshot: 'Bk',
      ace: 'Ac',
      venom: 'Ve',
      ember: 'Em',
      horseshoe: 'Hs',
      fifty_cal: '.50',
    };
    const prefix = this.isExplosive ? '!' : this.isShowdown ? '*' : '';
    return prefix + abbrevs[this.type];
  }

  setType(newType: TileType): void {
    this.type = newType;
    this.updateVisuals();
  }

  setExplosive(value: boolean): void {
    this.isExplosive = value;
    this.isShowdown = false;
    this.updateVisuals();
  }

  setShowdown(value: boolean): void {
    this.isShowdown = value;
    this.isExplosive = false;
    this.updateVisuals();
  }

  /**
   * Refresh the hazard status indicator after in-place mutation of the
   * hazard object (e.g. bomb countdown tick that doesn't reach zero).
   */
  refreshStatusIndicator(): void {
    this.updateStatusIndicator();
  }

  private updateVisuals(): void {
    const color = Phaser.Display.Color.HexStringToColor(
      TILE_COLORS[this.type] ?? '#808080',
    ).color;

    if (this.isExplosive) {
      this.rect.setFillStyle(color, 0.5);
      this.rect.setStrokeStyle(2, 0xffff00);
    } else if (this.isShowdown) {
      this.rect.setFillStyle(color, 0.6);
      this.rect.setStrokeStyle(2, 0xff00ff);
    } else {
      this.rect.setFillStyle(color, 0.2);
      this.rect.setStrokeStyle(1, color);
    }

    this.label.setText(this.abbreviation());
  }

  /**
   * Create or update the small status indicator shown in the bottom-right
   * corner of the tile when a hazard is active. Destroys it when cleared.
   *
   * Visual mapping:
   *   lock      → gray dot + "L"
   *   poison    → green dot + "P"
   *   bomb      → red dot + countdown number
   *   sand      → sandy dot + "?"
   *   barricade → dark dot + "B"
   */
  private updateStatusIndicator(): void {
    const cx = this.rect.x;
    const cy = this.rect.y;
    // Bottom-right corner: offset +10, +10 from tile center (within 30x30 inner area)
    const ix = Math.round(cx + 10);
    const iy = Math.round(cy + 10);

    if (this._hazard === null) {
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
      case 'lock':      return { dotColor: 0xaaaaaa, text: 'L' };
      case 'poison':    return { dotColor: 0x40d840, text: 'P' };
      case 'bomb':      return { dotColor: 0xff4040, text: String(hazard.countdown) };
      case 'sand':      return { dotColor: 0xe8c170, text: '?' };
      case 'barricade': return { dotColor: 0x888888, text: 'B' };
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

  setPosition(x: number, y: number): void {
    const cx = Math.round(x + TILE_SIZE / 2);
    const cy = Math.round(y + TILE_SIZE / 2);
    this.rect.setPosition(cx, cy);
    this.label.setPosition(cx, cy);
    if (this.highlight) {
      this.highlight.setPosition(cx, cy);
    }
    if (this.statusDot) {
      this.statusDot.setPosition(Math.round(cx + 10), Math.round(cy + 10));
    }
    if (this.statusLabel) {
      this.statusLabel.setPosition(Math.round(cx + 10), Math.round(cy + 10));
    }
  }

  setSelected(selected: boolean): void {
    if (selected && !this.highlight) {
      const pos = this.rect.getCenter();
      this.highlight = this.scene.add
        .rectangle(Math.round(pos.x), Math.round(pos.y), TILE_SIZE, TILE_SIZE)
        .setStrokeStyle(2, 0xffffff)
        .setFillStyle(0xffffff, 0.15);
    } else if (!selected && this.highlight) {
      this.highlight.destroy();
      this.highlight = null;
    }
  }

  getWorldCenter(): { x: number; y: number } {
    const pos = this.rect.getCenter();
    return { x: Math.round(pos.x), y: Math.round(pos.y) };
  }

  destroy(): void {
    this.rect.destroy();
    this.label.destroy();
    if (this.highlight) {
      this.highlight.destroy();
      this.highlight = null;
    }
    this.destroyStatusIndicator();
  }
}
