import type { EnemyIntent } from '../../types/combat';
import type { Enemy } from './Enemy';
import type { BoardHazardManager } from '../board/BoardHazardManager';

/**
 * Type-specific AI intent selection for enemies.
 *
 * Act 1 enemies:
 *   Coyote      -- attack / howl (summon). No board manipulation.
 *   Rattlesnake -- poison / bite. Blocks occasionally. Poison 2 tiles.
 *   Bandit      -- attack / lock. Blocks before big hits. Lock 1 tile.
 *   Vulture     -- low damage. Buries tiles on hit. Bury 3 tiles.
 *
 * Act 2 enemies:
 *   Prospector Gone Mad -- erratic bomber. Favors bombs, more frenzied when wounded.
 *   Dynamite Outlaw     -- tanky. Barricades + block, then attacks.
 *   Cave Bat            -- swarm unit. Aggressively buries tiles, low damage.
 *   Mine Cart           -- timed hazard. Always threatens crash damage.
 */

interface IntentOption {
  intent: EnemyIntent;
  weight: number;
}

export function chooseEnemyIntent(enemy: Enemy, aliveCount: number): EnemyIntent {
  const def = enemy.getDefinition();
  const hpRatio = enemy.state.health / enemy.state.maxHealth;

  switch (def.type) {
    // Act 1
    case 'coyote':
      return chooseCoyoteIntent(enemy, aliveCount);
    case 'rattlesnake':
      return chooseRattlesnakeIntent(enemy, hpRatio);
    case 'bandit':
      return chooseBanditIntent(enemy, hpRatio);
    case 'vulture':
      return chooseVultureIntent(enemy);
    // Act 2
    case 'prospector_gone_mad':
      return chooseProspectorIntent(enemy, hpRatio);
    case 'dynamite_outlaw':
      return chooseDynamiteOutlawIntent(enemy, hpRatio);
    case 'cave_bat':
      return chooseCaveBatIntent(enemy, aliveCount);
    case 'mine_cart':
      return chooseMineCartIntent(enemy);
    default:
      return enemy.chooseIntent();
  }
}

// ---------------------------------------------------------------------------
// Coyote: attack / howl (summon). No board manipulation.
// Howl more likely when alone.
// ---------------------------------------------------------------------------

function chooseCoyoteIntent(enemy: Enemy, aliveCount: number): EnemyIntent {
  const damage = rollDamage(enemy);
  const options: IntentOption[] = [
    { intent: { type: 'attack', value: damage, description: `ATK ${damage}` }, weight: 3 },
  ];

  // Howl to summon when alone; less likely when pack is full
  if (aliveCount < 3) {
    const howlWeight = aliveCount === 1 ? 3 : 1;
    options.push({
      intent: { type: 'summon', value: 1, description: 'HOWL' },
      weight: howlWeight,
    });
  }

  return weightedRandom(options);
}

// ---------------------------------------------------------------------------
// Rattlesnake: poison / bite. Blocks occasionally. Poison 2 tiles.
// Alternates between poisoning the board and biting.
// ---------------------------------------------------------------------------

function chooseRattlesnakeIntent(enemy: Enemy, hpRatio: number): EnemyIntent {
  const damage = rollDamage(enemy);
  const options: IntentOption[] = [
    { intent: { type: 'attack', value: damage, description: `BITE ${damage}` }, weight: 3 },
    { intent: { type: 'board-manipulation', value: 2, description: 'POISON 2' }, weight: 2 },
  ];

  // Block more when wounded
  if (hpRatio < 0.5) {
    options.push({
      intent: { type: 'block', value: 5, description: 'COIL +5' },
      weight: 2,
    });
  } else {
    options.push({
      intent: { type: 'block', value: 5, description: 'COIL +5' },
      weight: 1,
    });
  }

  return weightedRandom(options);
}

// ---------------------------------------------------------------------------
// Bandit: attack / lock. Blocks before big hits. Lock 1 tile.
// Pattern: block -> big attack, or just lock + attack.
// ---------------------------------------------------------------------------

function chooseBanditIntent(enemy: Enemy, hpRatio: number): EnemyIntent {
  const damage = rollDamage(enemy);
  const options: IntentOption[] = [
    { intent: { type: 'attack', value: damage, description: `ATK ${damage}` }, weight: 3 },
    { intent: { type: 'board-manipulation', value: 1, description: 'LOCK 1' }, weight: 2 },
  ];

  // Block more when healthy (preparing for big hits)
  if (hpRatio > 0.6) {
    options.push({
      intent: { type: 'block', value: 5, description: 'BLOCK +5' },
      weight: 2,
    });
  } else {
    // Desperate: attack more
    options.push({
      intent: { type: 'block', value: 5, description: 'BLOCK +5' },
      weight: 1,
    });
  }

  return weightedRandom(options);
}

// ---------------------------------------------------------------------------
// Vulture: low damage. Buries tiles on hit. Bury 3 tiles.
// Focuses on burying tiles rather than dealing damage.
// ---------------------------------------------------------------------------

function chooseVultureIntent(enemy: Enemy): EnemyIntent {
  const damage = rollDamage(enemy);
  const options: IntentOption[] = [
    { intent: { type: 'attack', value: damage, description: `PECK ${damage}` }, weight: 2 },
    { intent: { type: 'board-manipulation', value: 3, description: 'BURY 3' }, weight: 3 },
  ];

  return weightedRandom(options);
}

// ---------------------------------------------------------------------------
// Prospector Gone Mad: erratic bomber. Favors bombs, more frenzied when wounded.
// Bombs force the player to match them before they detonate.
// ---------------------------------------------------------------------------

function chooseProspectorIntent(enemy: Enemy, hpRatio: number): EnemyIntent {
  const damage = rollDamage(enemy);
  const bombWeight = hpRatio < 0.4 ? 5 : 3;
  const options: IntentOption[] = [
    { intent: { type: 'attack', value: damage, description: `PICKAXE ${damage}` }, weight: 2 },
    { intent: { type: 'board-manipulation', value: 1, description: 'BOMB' }, weight: bombWeight },
  ];

  // When badly wounded, may throw multiple bombs in desperation
  if (hpRatio < 0.3) {
    options.push({
      intent: { type: 'board-manipulation', value: 2, description: 'BOMB 2' },
      weight: 2,
    });
  }

  return weightedRandom(options);
}

// ---------------------------------------------------------------------------
// Dynamite Outlaw: tanky. Barricades + block, then attacks.
// Blocks to absorb damage, barricades to cut off cascades.
// ---------------------------------------------------------------------------

function chooseDynamiteOutlawIntent(enemy: Enemy, hpRatio: number): EnemyIntent {
  const damage = rollDamage(enemy);
  const options: IntentOption[] = [
    { intent: { type: 'attack', value: damage, description: `ATK ${damage}` }, weight: 3 },
    { intent: { type: 'board-manipulation', value: 1, description: 'BARRICADE' }, weight: 2 },
  ];

  // Block more when healthy (hunkering down)
  if (hpRatio > 0.5) {
    options.push({
      intent: { type: 'block', value: 8, description: 'BLOCK +8' },
      weight: 2,
    });
  } else {
    // Wounded: attacks become more desperate, less blocking
    options.push({
      intent: { type: 'block', value: 8, description: 'BLOCK +8' },
      weight: 1,
    });
  }

  return weightedRandom(options);
}

// ---------------------------------------------------------------------------
// Cave Bat: swarm unit. Aggressively buries tiles, low damage.
// Appears in groups of 3. Each bat buries tiles to disrupt the board.
// ---------------------------------------------------------------------------

function chooseCaveBatIntent(enemy: Enemy, aliveCount: number): EnemyIntent {
  const damage = rollDamage(enemy);
  // More bats alive = more coordinated burying
  const buryWeight = aliveCount >= 3 ? 4 : 3;
  const options: IntentOption[] = [
    { intent: { type: 'attack', value: damage, description: `SCREECH ${damage}` }, weight: 2 },
    { intent: { type: 'board-manipulation', value: 2, description: 'BURY 2' }, weight: buryWeight },
  ];

  return weightedRandom(options);
}

// ---------------------------------------------------------------------------
// Mine Cart: timed hazard encounter. Threatens massive crash damage.
// Not a traditional fight -- the player must deal enough damage before
// time runs out or suffer 50 damage.
// ---------------------------------------------------------------------------

function chooseMineCartIntent(enemy: Enemy): EnemyIntent {
  return {
    type: 'attack',
    value: enemy.getDefinition().maxDamage,
    description: 'CRASH 50',
  };
}

// ---------------------------------------------------------------------------
// Board manipulation execution
// ---------------------------------------------------------------------------

/**
 * Execute a board-manipulation intent. Returns a description of what happened.
 */
export function executeBoardManipulation(
  enemy: Enemy,
  intent: EnemyIntent,
  hazardManager: BoardHazardManager,
): string {
  const def = enemy.getDefinition();
  const desc = intent.description;

  if (desc.startsWith('POISON')) {
    const count = intent.value ?? 2;
    hazardManager.placeRandomPoison(count);
    return `${def.name} poisons ${count} tiles`;
  }

  if (desc.startsWith('LOCK')) {
    const count = intent.value ?? 1;
    hazardManager.placeRandomLocks(count);
    return `${def.name} locks ${count} tiles`;
  }

  if (desc.startsWith('BURY')) {
    const count = intent.value ?? 3;
    hazardManager.placeRandomSand(count);
    return `${def.name} buries ${count} tiles`;
  }

  if (desc.startsWith('BOMB')) {
    const count = intent.value ?? 1;
    hazardManager.placeRandomBombs(count);
    return `${def.name} places ${count} bombs`;
  }

  if (desc.startsWith('BARRICADE')) {
    const row = Math.floor(Math.random() * 8);
    hazardManager.placeBarricadeRow(row);
    return `${def.name} barricades row ${row}`;
  }

  return '';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rollDamage(enemy: Enemy): number {
  const def = enemy.getDefinition();
  return def.minDamage + Math.floor(Math.random() * (def.maxDamage - def.minDamage + 1));
}

function weightedRandom(options: IntentOption[]): EnemyIntent {
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * total;
  for (const opt of options) {
    roll -= opt.weight;
    if (roll <= 0) return opt.intent;
  }
  return options[0].intent;
}
