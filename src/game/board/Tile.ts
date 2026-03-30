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
  hazard: TileHazardState | null = null;

  private rect: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private highlight: Phaser.GameObjects.Rectangle | null = null;

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

  setPosition(x: number, y: number): void {
    this.rect.setPosition(
      Math.round(x + TILE_SIZE / 2),
      Math.round(y + TILE_SIZE / 2),
    );
    this.label.setPosition(
      Math.round(x + TILE_SIZE / 2),
      Math.round(y + TILE_SIZE / 2),
    );
    if (this.highlight) {
      this.highlight.setPosition(
        Math.round(x + TILE_SIZE / 2),
        Math.round(y + TILE_SIZE / 2),
      );
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
  }
}
