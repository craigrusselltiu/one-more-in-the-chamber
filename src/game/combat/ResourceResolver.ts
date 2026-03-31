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
 * Per-tile values x tile count x match bonus.
 */
export class ResourceResolver {
  resolve(match: MatchResult, tileUpgradeLevel: number): ResourceOutput {
    const def = TILE_DEFINITIONS[match.tileType];
    if (!def) return this.emptyOutput();

    const perTile = def.baseValue + tileUpgradeLevel * def.upgradeValue;
    const tileCount = match.tiles.length;
    const bonus = match.matchBonus;

    return this.computeOutput(match.tileType, perTile, tileCount, bonus);
  }

  resolveSingle(type: TileType, upgradeLevel: number): ResourceOutput {
    const def = TILE_DEFINITIONS[type];
    if (!def) return this.emptyOutput();

    const perTile = def.baseValue + upgradeLevel * def.upgradeValue;
    return this.computeOutput(type, perTile, 1, 1.0);
  }

  /** Resolve resources for multiple tiles of the same type at 1.0x each. */
  resolveCount(type: TileType, count: number, upgradeLevel: number): ResourceOutput {
    const def = TILE_DEFINITIONS[type];
    if (!def) return this.emptyOutput();

    const perTile = def.baseValue + upgradeLevel * def.upgradeValue;
    return this.computeOutput(type, perTile, count, 1.0);
  }

  private computeOutput(
    type: TileType,
    perTile: number,
    count: number,
    bonus: number,
  ): ResourceOutput {
    const output = this.emptyOutput();
    const total = Math.round(perTile * count * bonus);

    switch (type) {
      case 'bullet':
      case 'buckshot':
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
        output.dodgePercent = count; // +1%/tile, not affected by match bonus
        break;
      case 'dynamite':
        // Match-size-based: 1 for 3-match, 2 for 4-match, 3 for 5-match
        // Upgrades add +1 per upgrade level to the total (perTile - 1 = upgradeBonus)
        output.abilityCharges = Math.max(0, count - 2) + Math.round(perTile - 1);
        break;
      case 'stampede':
        output.damage = total;
        output.isAoE = true;
        break;
      case 'ace':
        output.aceMultiplier = count * 0.25; // +0.25x/tile, not affected by match bonus
        break;
      case 'venom':
        output.venomStacks = count; // stacks, not affected by match bonus
        break;
      case 'horseshoe':
        output.critPercent = count * 5; // +5%/tile, not affected by match bonus
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
