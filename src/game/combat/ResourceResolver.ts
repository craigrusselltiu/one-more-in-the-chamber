import type { TileType } from '../../types/game';
import type { MatchResult } from '../../types/combat';
import { TILE_DEFINITIONS } from '../../data/tiles';

export interface ResourceOutput {
  damage: number;
  block: number;
  gold: number;
  healing: number;
  abilityCharges: number;
  dodgePercent: number;
  venomStacks: number;
  critPercent: number;
  aceMultiplier: number;
  isAoE: boolean;
}

/**
 * ResourceResolver: universal resource generation rule.
 * "When a tile is cleared by any means, it generates its own resource."
 * Base values scale with tile count and match bonus; upgrade bonuses are
 * added flat to the total match output (not multiplied per tile).
 */
export class ResourceResolver {
  resolve(match: MatchResult, tileUpgradeLevel: number): ResourceOutput {
    const def = TILE_DEFINITIONS[match.tileType];
    if (!def) return this.emptyOutput();

    const count = match.tiles.length;

    // Per-tile upgrade tiles: upgrade adds per tile, not flat per match.
    if (match.tileType === 'buckshot' || match.tileType === 'fifty_cal') {
      const baseTotal = (def.baseValue + tileUpgradeLevel * def.upgradeValue) * count * match.matchBonus;
      return this.computeOutput(match.tileType, baseTotal, 0, count);
    }

    // Per-tile upgrade tiles NOT affected by match bonus (ace, horseshoe).
    if (match.tileType === 'ace' || match.tileType === 'horseshoe') {
      const perTileTotal = (def.baseValue + tileUpgradeLevel * def.upgradeValue) * count;
      return this.computeOutput(match.tileType, perTileTotal, 0, count);
    }

    const baseTotal = def.baseValue * count * match.matchBonus;
    const upgradeBonus = tileUpgradeLevel * def.upgradeValue;

    return this.computeOutput(match.tileType, baseTotal, upgradeBonus, count);
  }

  resolveSingle(type: TileType, upgradeLevel: number): ResourceOutput {
    const def = TILE_DEFINITIONS[type];
    if (!def) return this.emptyOutput();

    // Per-tile upgrade tiles: upgrade applies per tile, so include in base for a single tile.
    if (type === 'buckshot' || type === 'fifty_cal' || type === 'ace' || type === 'horseshoe') {
      return this.computeOutput(type, def.baseValue + upgradeLevel * def.upgradeValue, 0, 1);
    }

    const upgradeBonus = upgradeLevel * def.upgradeValue;
    return this.computeOutput(type, def.baseValue, upgradeBonus, 1);
  }

  /** Resolve resources for multiple tiles of the same type at 1.0x each. */
  resolveCount(type: TileType, count: number, upgradeLevel: number): ResourceOutput {
    const def = TILE_DEFINITIONS[type];
    if (!def) return this.emptyOutput();

    // Per-tile upgrade tiles: upgrade adds per tile, not flat per match.
    if (type === 'buckshot' || type === 'fifty_cal' || type === 'ace' || type === 'horseshoe') {
      const baseTotal = (def.baseValue + upgradeLevel * def.upgradeValue) * count;
      return this.computeOutput(type, baseTotal, 0, count);
    }

    const baseTotal = def.baseValue * count;
    const upgradeBonus = upgradeLevel * def.upgradeValue;
    return this.computeOutput(type, baseTotal, upgradeBonus, count);
  }

  private computeOutput(
    type: TileType,
    baseTotal: number,
    upgradeBonus: number,
    count: number,
  ): ResourceOutput {
    const output = this.emptyOutput();
    const total = Math.round(baseTotal + upgradeBonus);

    switch (type) {
      case 'bullet':
      case 'buckshot':
      case 'fifty_cal':
      case 'ember':
        output.damage = total;
        break;
      case 'iron':
        output.block = total;
        break;
      case 'gold':
        output.gold = total;
        break;
      case 'whiskey':
        output.healing = total;
        break;
      case 'ricochet':
        output.damage = total;
        break;
      case 'smoke':
        output.dodgePercent = count; // +1%/tile, not affected by match bonus or upgrades
        break;
      case 'dynamite':
        // Match-size-based: 1 for 3-match, 2 for 4-match, 3 for 5-match + flat upgrade bonus
        output.abilityCharges = Math.max(0, count - 2) + Math.round(upgradeBonus);
        break;
      case 'stampede':
        output.damage = total;
        output.isAoE = true;
        break;
      case 'ace':
        output.aceMultiplier = baseTotal; // (base + upgrade) * count, no match bonus
        break;
      case 'venom':
        output.venomStacks = count; // stacks, not affected by match bonus or upgrades
        break;
      case 'horseshoe':
        output.critPercent = baseTotal; // (base + upgrade) * count, no match bonus
        break;
    }

    return output;
  }

  private emptyOutput(): ResourceOutput {
    return {
      damage: 0,
      block: 0,
      gold: 0,
      healing: 0,
      abilityCharges: 0,
      dodgePercent: 0,
      venomStacks: 0,
      critPercent: 0,
      aceMultiplier: 0,
      isAoE: false,
    };
  }
}
