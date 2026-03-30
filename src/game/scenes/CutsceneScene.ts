import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../GameConfig';

/**
 * CutsceneScene: boss intro cinematic.
 * MVP: colored background + large centered text.
 */
export class CutsceneScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CutsceneScene' });
  }

  create(data: { bossName: string; flavourText: string }): void {
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor('#0a0808');

    const centerX = Math.round(GAME_WIDTH / 2);
    const centerY = Math.round(GAME_HEIGHT / 2);

    // Boss name
    this.add
      .text(centerX, centerY - 20, data.bossName ?? 'BOSS', {
        fontSize: '24px',
        color: '#FFD700',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Flavour text
    this.add
      .text(centerX, centerY + 20, data.flavourText ?? '', {
        fontSize: '10px',
        color: '#E0D8C8',
        fontFamily: 'monospace',
        wordWrap: { width: 400 },
        align: 'center',
      })
      .setOrigin(0.5);

    // Click to continue
    this.input.once('pointerdown', () => {
      this.scene.start('CombatScene');
    });
  }
}
