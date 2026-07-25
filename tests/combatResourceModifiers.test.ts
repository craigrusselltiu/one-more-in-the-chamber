import assert from 'node:assert/strict';
import test from 'node:test';
import type { ResourceOutput } from '../src/game/combat/ResourceResolver.ts';
import {
  applyDynamicTileResources,
  applyTileHitArtifactModifiers,
  scaleResourceOutput,
} from '../src/game/combat/resourceModifiers.ts';

function emptyOutput(overrides: Partial<ResourceOutput> = {}): ResourceOutput {
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
    ...overrides,
  };
}

const context = {
  playerBlock: 24,
  playerHealth: 50,
  playerMaxHealth: 100,
  swapsRemaining: 2,
  aliveEnemyCount: 2,
};

test('Chainsaw uses Mirage-adjusted level before match multipliers', () => {
  const base = applyDynamicTileResources(emptyOutput(), 'chainsaw', 3, 2, context);
  assert.equal(base.damage, 15);

  const withAce = scaleResourceOutput(base, 2, 2);
  assert.equal(withAce.damage, 30);
});

test('other combat-state damage is present before match multipliers', () => {
  assert.equal(applyDynamicTileResources(emptyOutput(), 'boulder', 3, 0, context).damage, 12);
  assert.equal(applyDynamicTileResources(emptyOutput({ damage: 3 }), 'stampede', 3, 0, context).damage, 9);
  assert.equal(applyDynamicTileResources(emptyOutput({ damage: 3 }), 'hourglass', 3, 1, context).damage, 9);
});

test('Saloon-generated gun hits can trigger Envenomed Ammo', () => {
  const output = applyTileHitArtifactModifiers('bullet', emptyOutput({ damage: 2 }), {
    twinRevolvers: false,
    envenomedAmmo: true,
    renosCoin: false,
  });

  assert.equal(output.damage, 2);
  assert.equal(output.poisonStacks, 1);
});

test('a missed generated gun hit does not apply Envenomed Ammo', () => {
  const output = applyTileHitArtifactModifiers('bullet', emptyOutput({ damage: 2 }), {
    twinRevolvers: true,
    envenomedAmmo: true,
    renosCoin: false,
    random: () => 0,
  });

  assert.equal(output.damage, 0);
  assert.equal(output.poisonStacks, 0);
  assert.equal(output.missed, true);
});

test('Ace continues to multiply Loot stacks', () => {
  const output = scaleResourceOutput(emptyOutput({ lootStacks: 3 }), 2, 2);
  assert.equal(output.lootStacks, 6);
});
