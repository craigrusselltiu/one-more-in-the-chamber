import Phaser from 'phaser';

type CombatEffectKey = 'bomb' | 'spark';

interface CombatEffectConfig {
  textureKey: string;
  animKey: string;
  frameRate: number;
  scale: number;
  depth: number;
}

const EFFECTS: Record<CombatEffectKey, CombatEffectConfig> = {
  bomb: {
    textureKey: 'effect_bomb',
    animKey: 'effect_bomb_play',
    frameRate: 16,
    scale: 2,
    depth: 30,
  },
  spark: {
    textureKey: 'effect_spark',
    animKey: 'effect_spark_play',
    frameRate: 60,
    scale: 2,
    depth: 31,
  },
};

export class CombatEffectPlayer {
  constructor(private readonly scene: Phaser.Scene) {}

  play(key: CombatEffectKey, x: number, y: number): void {
    const config = EFFECTS[key];
    if (!this.scene.textures.exists(config.textureKey)) return;

    this.ensureAnimation(config);

    const sprite = this.scene.add
      .sprite(Math.round(x), Math.round(y), config.textureKey)
      .setScale(config.scale)
      .setDepth(config.depth);

    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      sprite.destroy();
    });
    sprite.play(config.animKey);
  }

  private ensureAnimation(config: CombatEffectConfig): void {
    if (this.scene.anims.exists(config.animKey)) return;

    this.scene.anims.create({
      key: config.animKey,
      frames: this.scene.anims.generateFrameNumbers(config.textureKey),
      frameRate: config.frameRate,
      repeat: 0,
    });
  }
}
