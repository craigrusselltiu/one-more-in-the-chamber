import type { TileType } from '../../types/game';
import type { MatchResult } from '../../types/combat';
import { TILE_DEFINITIONS } from '../../data/tiles';

export interface ResourceOutput {
  damage: number;
  block: number;
  gold: number;
  healing: number;
  abilityCharges: number;
  poisonStacks: number;
  aceStacks: number;
  luckyStacks: number;
  barricadeStacks: number;
  vulnerableStacks: number;
  bountyStacks: number;
  ragefulStacks: number;
  sturdyStacks: number;
  chainStacks: number;
  duelStacks: number;
  lootStacks: number;
  /** Whether a Chip tile hit (true) or missed (false). Undefined for non-chip tiles. */
  chipHit?: boolean;
  /** The damage Chip would deal if it hit (used by Reno's Coin damage doubling). */
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
  /** Duel: if true, damage is dealt a second time. */
  duelDoubleHit?: boolean;
}

/** Tiles where upgrade scales per tile (not flat per match). */
const PER_TILE_UPGRADE: Set<TileType> = new Set([
  'buckshot', 'fifty_cal', 'barricade', 'chip', 'boulder', 'bounty', 'duel',
  'hourglass', 'sacrificial_blade', 'jackhammer', 'nunchucks', 'milk', 'cheese',
  'obsidian',
]);

/**
 * ResourceResolver: universal resource generation.
 * "When a tile is cleared by any means, it generates its own resource."
 */
export class ResourceResolver {
  /** Whether cavalry bonus swap has been granted this turn. */
  cavalrySwapUsedThisTurn = false;
  /** Chip marble bag (only used when an artifact like Reno's Coin opts in via
   *  setChipBucket). When unset, chip hits are a true independent 50/50 roll. */
  private chipBucketHits = 0;
  private chipBucketSize = 0;
  private chipBucketEnabled = false;
  private chipHitsLeft = 0;
  private chipDrawsLeft = 0;

  /** Opt into a bag-based chip distribution with the given hit ratio. */
  setChipBucket(hits: number, size: number): void {
    this.chipBucketHits = hits;
    this.chipBucketSize = size;
    this.chipBucketEnabled = true;
    this.chipHitsLeft = 0;
    this.chipDrawsLeft = 0;
  }

  private drawChipHit(): boolean {
    // Default behaviour: true independent 50/50 (no bag, no streaks-by-design).
    if (!this.chipBucketEnabled) return Math.random() < 0.5;
    if (this.chipDrawsLeft <= 0) {
      this.chipHitsLeft = this.chipBucketHits;
      this.chipDrawsLeft = this.chipBucketSize;
    }
    const hit = Math.random() < this.chipHitsLeft / this.chipDrawsLeft;
    if (hit) this.chipHitsLeft--;
    this.chipDrawsLeft--;
    return hit;
  }

  resetFight(): void {
    this.cavalrySwapUsedThisTurn = false;
    this.chipHitsLeft = 0;
    this.chipDrawsLeft = 0;
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

  resolveSingle(type: TileType, upgradeLevel: number, playerBlock = 0, swapsRemaining = 0): ResourceOutput {
    const def = TILE_DEFINITIONS[type];
    if (!def) return this.emptyOutput();

    const { baseTotal, upgradeBonus } = this.computeTotals(type, def.baseValue, def.upgradeValue, 1, upgradeLevel, 1.0);

    // Flat-upgrade tiles: divide upgrade bonus by 3 on single resolve
    const adjustedBonus = PER_TILE_UPGRADE.has(type) ? upgradeBonus : Math.floor(upgradeBonus / 3);
    const output = this.buildOutput(type, baseTotal, adjustedBonus, 1);
    // Boulder: damage = floor(block / 5) on single resolve
    if (type === 'boulder') output.damage = Math.floor(playerBlock / 5);
    // Hourglass: add swaps-remaining bonus damage on single resolve
    if (type === 'hourglass') output.damage += swapsRemaining;
    return output;
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
        // Spread effect handled by CascadeResolver
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
        output.poisonStacks = count + Math.round(upgradeBonus);
        output.piercesBlock = true;
        break;

      case 'cavalry':
        output.block = total;
        if (count >= 4 && !this.cavalrySwapUsedThisTurn) {
          output.bonusSwaps = 1;
          this.cavalrySwapUsedThisTurn = true;
        }
        break;

      case 'duel':
        // Always deals damage; on exactly 4-match, damage is dealt twice
        output.damage = total;
        output.duelDoubleHit = count === 4;
        output.duelStacks = 1;
        break;

      case 'boulder':
        // Per-tile damage. CombatManager adds player.block as bonus.
        output.damage = total;
        break;

      case 'chain':
        output.damage = total;
        output.chainStacks = 1;
        break;

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
        // 2 healing + (tiles - 3) + (level * 1)
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
        output.luckyStacks = total;
        break;

      case 'waste':
        output.poisonStacks = count + Math.round(upgradeBonus);
        break;

      // --- Bounty (1+upgrade stacks per tile) ---
      case 'bounty':
        output.bountyStacks = total;
        break;

      // --- Chip (50/50 gamble: per-tile damage or 0) ---
      case 'chip': {
        const hit = this.drawChipHit();
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

      case 'charcoal':
        // Flat 1 damage + 1 block per match regardless of tile count.
        // Upgrade adds flat damage per level (block unchanged).
        output.damage = 1 + Math.round(upgradeBonus);
        output.block = 1;
        break;

      // --- New tiles ---

      case 'axe':
        // Per-tile upgrade. CombatManager doubles damage when target has block.
        output.damage = total;
        break;

      case 'mace':
        output.damage = total;
        output.piercesBlock = true;
        break;

      case 'cactus':
        // Block per tile (flat upgrade). CombatManager grants +1 Thorns.
        output.block = total;
        break;

      case 'loot':
        // Grants Loot stacks; CombatManager triggers effect when reaching 20.
        output.lootStacks = total;
        break;

      case 'hourglass':
        // Damage scales with swaps used this turn (added in CombatManager).
        // Base is per-tile upgrade only; 0 without swaps.
        output.damage = total;
        break;

      case 'chainsaw':
        // Damage = player's missing-HP fraction scaled per tile (added in CombatManager).
        // Upgrade contributes +1% missing HP per tile per level; base is 0 here.
        output.damage = 0;
        break;

      case 'sacrificial_blade':
        // Per-tile upgrade. CombatManager applies the -1 HP self-cost (min 1 HP).
        output.damage = total;
        break;

      case 'jackhammer':
      case 'nunchucks':
        // Per-tile upgrade. CombatManager tracks per-combat level bumps on
        // consecutive same-target attacks.
        output.damage = total;
        break;

      case 'milk':
        // Per-tile block; match-based healing (1 HP per 3-match, +1 per extra tile).
        output.block = total;
        output.healing = Math.max(0, count - 2);
        break;

      case 'cheese':
        // Per-tile block (upgrade); per-tile healing (flat 1 per tile).
        output.block = total;
        output.healing = count;
        break;

      case 'obsidian':
        // Per-tile damage and block (both scale with upgrade).
        output.damage = total;
        output.block = total;
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
      poisonStacks: 0,
      aceStacks: 0,
      luckyStacks: 0,
      barricadeStacks: 0,
      vulnerableStacks: 0,
      bountyStacks: 0,
      ragefulStacks: 0,
      sturdyStacks: 0,
      chainStacks: 0,
      duelStacks: 0,
      lootStacks: 0,
      isAoE: false,
      piercesBlock: false,
      targetsHighestHp: false,
      bonusSwaps: 0,
      buckshotHits: 0,
    };
  }
}
