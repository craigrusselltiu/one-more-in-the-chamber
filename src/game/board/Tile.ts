import Phaser from 'phaser';
import type { TileType } from '../../types/game';
import type { TileHazardState } from '../../types/tiles';
import { TILE_COLORS } from '../../data/tiles';

const TILE_SIZE = 32;
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
    const color = Phaser.Display.Color.HexStringToColor(
      TILE_COLORS[newType] ?? '#808080',
    ).color;
    this.rect.setFillStyle(color, 0.2);
    this.rect.setStrokeStyle(1, color);
    this.label.setText(this.abbreviation());
  }

  setPosition(x: number, y: number): void {
    this.rect.setPosition(Math.round(x + TILE_SIZE / 2), Math.round(y + TILE_SIZE / 2));
    this.label.setPosition(Math.round(x + TILE_SIZE / 2), Math.round(y + TILE_SIZE / 2));
  }

  destroy(): void {
    this.rect.destroy();
    this.label.destroy();
  }
}
