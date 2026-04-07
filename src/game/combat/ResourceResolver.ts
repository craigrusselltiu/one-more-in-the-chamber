import type { TileType } from '../../types/game';
import type { MatchResult } from '../../types/combat';
import { TILE_DEFINITIONS } from '../../data/tiles';

export interface ResourceOutput {
  damage: number;
  block: number;
  gold: number;
  healing: number;
  abilityCharges: number;
  venomStacks: number;
  aceStacks: number;
  luckyStacks: number;
  barricadeStacks: number;
  vulnerableStacks: number;
  bountyStacks: number;
  ragefulStacks: number;
  sturdyStacks: number;
  /** Whether a Chip tile hit (true) or missed (false). Undefined for non-chip tiles. */
  chipHit?: boolean;
  /** The damage Chip would deal if it hit (used by Reno's Coin re-roll). */
  chipDamageIfHit?: number;
  /** Double Down artifact: HP penalty on chip miss. */
  doubleDownPenalty?: number;
  isAoE: boolean;
  /** If true, damage pierces block. */
  piercesBlock: boolean;
  /** If true, targets the highest-HP enemy instead of the targeted one. */
  targetsHighestHp: boolean;
  /** Extra swaps to grant this turn. */
  bonusSwaps: number;
  /** Buckshot: number of individual hits, each targeting a random enemy. */
  buckshotHits: number;
}

/** Tiles where upgrade scales per tile (not flat per match). */
const PER_TILE_UPGRADE: Set<TileType> = new Set([
  'buckshot', 'fifty_cal', 'barricade', 'chip', 'boulder', 'bounty',
]);

/**
 * ResourceResolver: universal resource generation.
 * "When a tile is cleared by any means, it generates its own resource."
 */
export class ResourceResolver {
  /** Persistent chain damage bonus that increases per Chain match in a fight. */
  chainBonusThisFight = 0;
  /** Whether cavalry bonus swap has been granted this turn. */
  cavalrySwapUsedThisTurn = false;

  resetFight(): void {
    this.chainBonusThisFight = 0;
    this.cavalrySwapUsedThisTurn = false;
  }

  resetTurn(): void {
    this.cavalrySwapUsedThisTurn = false;
  }

  resolve(match: MatchResult, upgradeLevel: number): ResourceOutput {
    const def = TILE_DEFINITIONS[match.tileType];
    if (!def) return this.emptyOutput();

    const count = match.tiles.length;
    const { baseTotal, upgradeBonus } = this.computeTotals(match.tileType, def.baseValue, def.upgradeValue, count, upgradeLevel, match.matchBonus);

    return this.buildOutput(match.tileType, baseTotal, upgradeBonus, count);
  }

  resolveSingle(type: TileType, upgradeLevel: number): ResourceOutput {
    const def = TILE_DEFINITIONS[type];
    if (!def) return this.emptyOutput();

    const { baseTotal, upgradeBonus } = this.computeTotals(type, def.baseValue, def.upgradeValue, 1, upgradeLevel, 1.0);

    return this.buildOutput(type, baseTotal, upgradeBonus, 1);
  }

  resolveCount(type: TileType, count: number, upgradeLevel: number): ResourceOutput {
    const def = TILE_DEFINITIONS[type];
    if (!def) return this.emptyOutput();

    const { baseTotal, upgradeBonus } = this.computeTotals(type, def.baseValue, def.upgradeValue, count, upgradeLevel, 1.0);

    return this.buildOutput(type, baseTotal, upgradeBonus, count);
  }

  private computeTotals(
    type: TileType,
    baseValue: number,
    upgradeValue: number,
    count: number,
    upgradeLevel: number,
    matchBonus: number,
  ): { baseTotal: number; upgradeBonus: number } {
    if (PER_TILE_UPGRADE.has(type)) {
      // Upgrade scales per tile
      return {
        baseTotal: (baseValue + upgradeLevel * upgradeValue) * count * matchBonus,
        upgradeBonus: 0,
      };
    }
    // Flat upgrade bonus added to match total
    return {
      baseTotal: baseValue * count * matchBonus,
      upgradeBonus: upgradeLevel * upgradeValue,
    };
  }

  private buildOutput(
    type: TileType,
    baseTotal: number,
    upgradeBonus: number,
    count: number,
  ): ResourceOutput {
    const output = this.emptyOutput();
    const total = Math.round(baseTotal + upgradeBonus);

    switch (type) {
      // --- Damage tiles ---
      case 'bullet':
        output.damage = total;
        break;

      case 'buckshot':
        // Each tile hits a random enemy independently
        output.buckshotHits = count;
        output.damage = Math.round(total / count); // damage per hit
        break;

      case 'fifty_cal':
        output.damage = count >= 5 ? total * 2 : total;
        break;

      case 'stampede':
        output.damage = total;
        output.isAoE = true;
        break;

      case 'ricochet':
        // Damage is fixed at 1 per tile (upgrades affect destroyed tile count, not damage)
        output.damage = count;
        break;

      case 'prairie_fire':
        output.damage = total;
        // Spread effect handled by CascadeResolver (like ember was)
        break;

      case 'tombstone':
        // Base damage; doubling for low-HP targets handled by CombatManager
        output.damage = total;
        break;

      case 'shank':
        output.damage = total;
        output.vulnerableStacks = 1;
        break;

      case 'rattler':
        output.damage = total;
        output.venomStacks = count + Math.round(upgradeBonus);
        output.piercesBlock = true;
        break;

      case 'cavalry':
        output.damage = total;
        if (count >= 4 && !this.cavalrySwapUsedThisTurn) {
          output.bonusSwaps = 1;
          this.cavalrySwapUsedThisTurn = true;
        }
        break;

      case 'duel':
        // Only deals damage on exactly 3-match
        output.damage = count === 4 ? total : 0;
        break;

      case 'boulder':
        // Per-tile damage. CombatManager adds player.block as bonus.
        output.damage = total;
        break;

      case 'chain': {
        const chainTotal = Math.round(baseTotal + upgradeBonus) + this.chainBonusThisFight * count;
        output.damage = chainTotal;
        this.chainBonusThisFight += 1; // +1 per Chain match this combat
        break;
      }

      // --- Block tiles ---
      case 'iron':
        output.block = total;
        break;

      case 'barricade':
        output.block = total;
        output.barricadeStacks = 1;
        break;

      // --- Gold ---
      case 'gold':
        output.gold = total;
        break;

      // --- Healing (per 3-match; +1 per extra tile) ---
      case 'whiskey':
        // Base 2 HP for 3-match, +1 per extra tile
        output.healing = 2 + Math.max(0, count - 3) + Math.round(upgradeBonus);
        break;

      case 'saloon':
        output.healing = Math.max(0, count - 2) + Math.round(upgradeBonus);
        // Adjacent tile resource generation handled by CombatManager
        break;

      // --- Ability charge ---
      case 'battery':
        // 1 for 3-match, 2 for 4, 3 for 5, etc. + flat upgrade
        output.abilityCharges = Math.max(0, count - 2) + Math.round(upgradeBonus);
        break;

      // --- Status stacks (no match bonus scaling) ---
      case 'ace':
        output.aceStacks = count + Math.round(upgradeBonus);
        break;

      case 'horseshoe':
        output.luckyStacks = count + Math.round(upgradeBonus);
        break;

      case 'venom':
        output.venomStacks = count + Math.round(upgradeBonus);
        break;

      // --- Bounty (1+upgrade stacks per tile) ---
      case 'bounty':
        output.bountyStacks = total;
        break;

      // --- Chip (50/50 gamble: per-tile damage or 0) ---
      case 'chip': {
        const hit = Math.random() < 0.6;
        output.damage = hit ? total : 0;
        output.chipHit = hit;
        output.chipDamageIfHit = total;
        break;
      }

      // --- Special ---
      case 'mirage':
      case 'showdown':
      case 'tumbleweed':
      case 'fools_gold':
        // No resource generation
        break;
    }

    return output;
  }

  emptyOutput(): ResourceOutput {
    return {
      damage: 0,
      block: 0,
      gold: 0,
      healing: 0,
      abilityCharges: 0,
      venomStacks: 0,
      aceStacks: 0,
      luckyStacks: 0,
      barricadeStacks: 0,
      vulnerableStacks: 0,
      bountyStacks: 0,
      ragefulStacks: 0,
      sturdyStacks: 0,
      isAoE: false,
      piercesBlock: false,
      targetsHighestHp: false,
      bonusSwaps: 0,
      buckshotHits: 0,
    };
  }
}
