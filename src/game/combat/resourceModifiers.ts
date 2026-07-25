import type { TileType } from '../../types/game';
import type { ResourceOutput } from './ResourceResolver';

export interface DynamicTileResourceContext {
  playerBlock: number;
  playerHealth: number;
  playerMaxHealth: number;
  swapsRemaining: number;
  aliveEnemyCount: number;
}

/**
 * Add resources whose base value depends on live combat state.
 *
 * This runs before traits, artifacts, crits, Ace, consumables, and cascade
 * multipliers so dynamic damage follows the same rules as every other tile.
 */
export function applyDynamicTileResources(
  output: ResourceOutput,
  tileType: TileType,
  tileCount: number,
  upgradeLevel: number,
  context: DynamicTileResourceContext,
): ResourceOutput {
  const modified = { ...output };

  switch (tileType) {
    case 'boulder':
      modified.damage = Math.floor(context.playerBlock / 5) * tileCount;
      break;
    case 'stampede':
      modified.damage += context.aliveEnemyCount * tileCount;
      break;
    case 'hourglass':
      modified.damage += context.swapsRemaining * tileCount;
      break;
    case 'chainsaw': {
      const missingHealth = Math.max(0, context.playerMaxHealth - context.playerHealth);
      const missingHealthPercent = 0.09 + upgradeLevel * 0.01;
      modified.damage += Math.floor(missingHealth * missingHealthPercent) * tileCount;
      break;
    }
  }

  return modified;
}

export interface TileHitArtifactOptions {
  twinRevolvers: boolean;
  envenomedAmmo: boolean;
  renosCoin: boolean;
  random?: () => number;
}

/** Apply artifact effects that belong to the generated tile hit itself. */
export function applyTileHitArtifactModifiers(
  tileType: TileType,
  output: ResourceOutput,
  options: TileHitArtifactOptions,
): ResourceOutput {
  const modified = { ...output };
  const isGunTile = tileType === 'bullet' || tileType === 'fifty_cal'
    || tileType === 'buckshot' || tileType === 'ricochet';

  if (options.twinRevolvers && isGunTile) {
    const missed = (options.random ?? Math.random)() < 0.1;
    if (missed) {
      modified.damage = 0;
      modified.missed = true;
    } else {
      modified.damage = Math.round(modified.damage * 1.5);
    }
  }

  if (options.envenomedAmmo && isGunTile && !modified.missed) {
    modified.poisonStacks += 1;
  }

  if (options.renosCoin && tileType === 'chip') {
    if (modified.chipHit) {
      modified.damage *= 2;
    } else {
      modified.doubleDownPenalty = 1;
    }
  }

  return modified;
}

/** Scale all match resources while keeping damage-only modifiers separate. */
export function scaleResourceOutput(
  output: ResourceOutput,
  totalMultiplier: number,
  damageMultiplier: number,
): ResourceOutput {
  return {
    ...output,
    damage: Math.floor(output.damage * damageMultiplier),
    block: Math.floor(output.block * totalMultiplier),
    gold: Math.floor(output.gold * totalMultiplier),
    healing: Math.floor(output.healing * totalMultiplier),
    aceStacks: Math.floor(output.aceStacks * totalMultiplier),
    poisonStacks: Math.floor(output.poisonStacks * totalMultiplier),
    luckyStacks: Math.floor(output.luckyStacks * totalMultiplier),
    bountyStacks: Math.floor(output.bountyStacks * totalMultiplier),
    lootStacks: Math.floor(output.lootStacks * totalMultiplier),
    abilityCharges: Math.floor(output.abilityCharges * totalMultiplier),
  };
}
