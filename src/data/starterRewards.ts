import type { RunState, TileType, TraitId } from '../types/game';
import { ARTIFACTS } from './artifacts';
import { CONSUMABLES } from './consumables';
import { TRAITS } from './traits';
import { ADDITIONAL_POOL, TILE_DEFINITIONS } from './tiles';
import { useRunStore } from '../store/runStore';
import { createSeededRandom, seededShuffle } from '../utils/seededRandom';
import { getArtifactPoolForRun } from '../utils/artifactSelection';
import { applyArtifactGoldGainModifier } from '../utils/goldGain';
import { useMetaStore } from '../store/metaStore';

/**
 * Pre-run starter reward definitions. Three pools (tile / upgrade / sacrifice).
 * One reward from each pool is rolled per run; the player picks one of the three.
 *
 * Each reward owns its own apply() so the StarterScreen doesn't need a switch
 * over reward IDs. apply() calls existing runStore mutations directly.
 */

export type StarterSlot = 'tile' | 'upgrade' | 'sacrifice';
export type StarterRewardKind = 'instant' | 'upgrade_choice' | 'swap_choice';

export interface StarterReward {
  id: string;
  slot: StarterSlot;
  label: string;
  /** Short body text shown on the reward card. */
  description: string;
  kind: StarterRewardKind;
  swapTileType?: TileType;
  artifactKeyword?: {
    text: string;
    artifactId: string;
  };
  apply: (rand: () => number, selectedTileType?: TileType) => void;
}

interface StarterRewardFactory {
  id: string;
  slot: StarterSlot;
  build: (seed: string, run: RunState) => StarterReward;
}

function pickRandom<T>(arr: T[], rand: () => number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(rand() * arr.length)];
}

function upgradableTiles(run: RunState): TileType[] {
  return run.activeTileTypes.filter((t) => !!TILE_DEFINITIONS[t]?.upgradeText);
}

function upgradeRandomTiles(rand: () => number, count: number): void {
  const store = useRunStore.getState();
  const run = store.run;
  if (!run) return;
  const pool = seededShuffle(upgradableTiles(run), rand);
  if (pool.length === 0) return;
  const picks = pool.slice(0, Math.min(count, pool.length));
  for (const pick of picks) {
    store.upgradeTile(pick);
  }
  if (count > picks.length) {
    for (let i = picks.length; i < count; i++) {
      const pick = pool[Math.floor(rand() * pool.length)];
      store.upgradeTile(pick);
    }
  }
}

function grantArtifactOfRarity(
  rand: () => number,
  rarity: 'common' | 'uncommon' | 'rare',
  count = 1,
): void {
  const store = useRunStore.getState();
  const run = store.run;
  if (!run) return;
  const ownedIds = new Set(run.artifacts.map((artifact) => artifact.id));
  let pool = getArtifactPoolForRun(run).filter((artifact) => (artifact.rarity ?? 'common') === rarity);
  if (pool.length === 0) {
    pool = ARTIFACTS.filter(
      (artifact) =>
        (artifact.rarity ?? 'common') === rarity &&
        !artifact.tags.includes('corrupt') &&
        (!artifact.exclusive || artifact.exclusive === run.character) &&
        !ownedIds.has(artifact.id),
    );
  }
  if (pool.length === 0) {
    pool = ARTIFACTS.filter(
      (artifact) =>
        (artifact.rarity ?? 'common') === rarity &&
        !artifact.tags.includes('corrupt') &&
        (!artifact.exclusive || artifact.exclusive === run.character),
    );
  }
  if (pool.length === 0) return;
  for (let i = 0; i < count; i++) {
    const pick = pickRandom(pool, rand);
    if (!pick) return;
    store.addArtifact({ id: pick.id, tags: pick.tags });
  }
}

function grantRandomConsumables(rand: () => number, count: number): void {
  const store = useRunStore.getState();
  for (let i = 0; i < count; i++) {
    const pick = pickRandom(CONSUMABLES, rand);
    if (!pick) return;
    store.addConsumable({ id: pick.id });
  }
}

function recomputeTraitCounts(artifacts: RunState['artifacts']): RunState['traitCounts'] {
  const traitCounts: RunState['traitCounts'] = {};
  for (const artifact of artifacts) {
    for (const tag of artifact.tags) {
      traitCounts[tag] = (traitCounts[tag] ?? 0) + 1;
    }
  }
  return traitCounts;
}

function discoverActivatedTraits(traitCounts: Partial<Record<TraitId, number>>): void {
  const meta = useMetaStore.getState();
  for (const trait of TRAITS) {
    const firstBreakpoint = trait.breakpoints[0]?.threshold ?? 1;
    if ((traitCounts[trait.id] ?? 0) >= firstBreakpoint) {
      meta.discoverTrait(trait.id);
    }
  }
}

function applyGoldenHunger(): void {
  useRunStore.setState((state) => {
    if (!state.run) return state;

    const alreadyHasGreed = state.run.artifacts.some((artifact) => artifact.id === 'greed');
    const artifacts = state.run.artifacts.filter((artifact) => !artifact.tags.includes('corrupt'));
    artifacts.push({ id: 'greed', tags: ['corrupt'] });

    const payout = alreadyHasGreed ? 0 : applyArtifactGoldGainModifier(287, state.run.artifacts);

    const traitCounts = recomputeTraitCounts(artifacts);
    discoverActivatedTraits(traitCounts);

    return {
      run: {
        ...state.run,
        artifacts,
        traitCounts,
        gold: state.run.gold + payout,
        goldObtained: state.run.goldObtained + payout,
        artifactsObtained: state.run.artifactsObtained + (alreadyHasGreed ? 0 : 1),
      },
    };
  });
  useMetaStore.getState().discoverArtifact('greed');
}

function getStarterHpSacrificeAmount(run: RunState): number {
  return Math.max(1, Math.floor(run.health * 0.1));
}

function getAdditionalTilePool(run: RunState): TileType[] {
  return ADDITIONAL_POOL.filter((tileType) => !run.activeTileTypes.includes(tileType));
}

function getStarterSwapTile(seed: string, rewardId: string, run: RunState): TileType {
  const pool = getAdditionalTilePool(run);
  const rand = createSeededRandom(`${seed}-starter-${rewardId}-swap`);
  return pickRandom(pool, rand) ?? 'chain';
}

const TILE_BOONS: StarterRewardFactory[] = [
  {
    id: 'bonesmith',
    slot: 'tile',
    build: () => ({
      id: 'bonesmith',
      slot: 'tile',
      label: 'Bonesmith',
      description: 'Upgrade a tile of your choice.',
      kind: 'upgrade_choice',
      apply: (_rand, selectedTileType) => {
        if (!selectedTileType) return;
        useRunStore.getState().upgradeTile(selectedTileType);
      },
    }),
  },
  {
    id: 'bone_rattle',
    slot: 'tile',
    build: () => ({
      id: 'bone_rattle',
      slot: 'tile',
      label: 'Bone Rattle',
      description: 'Upgrade 2 random tiles.',
      kind: 'instant',
      apply: (rand) => upgradeRandomTiles(rand, 2),
    }),
  },
  {
    id: 'trade_up',
    slot: 'tile',
    build: (seed, run) => {
      const swapTileType = getStarterSwapTile(seed, 'trade_up', run);
      return {
        id: 'trade_up',
        slot: 'tile',
        label: 'Trade Up',
        description: `Swap a tile with ${TILE_DEFINITIONS[swapTileType].label}.`,
        kind: 'swap_choice',
        swapTileType,
        apply: (_rand, selectedTileType) => {
          if (!selectedTileType) return;
          useRunStore.getState().swapTileType(selectedTileType, swapTileType);
        },
      };
    },
  },
];

const UPGRADES: StarterRewardFactory[] = [
  {
    id: 'big_bones',
    slot: 'upgrade',
    build: () => ({
      id: 'big_bones',
      slot: 'upgrade',
      label: 'Big Bones',
      description: 'Gain 6 max HP and heal 6 HP.',
      kind: 'instant',
      apply: () => {
        const store = useRunStore.getState();
        const run = store.run;
        if (!run) return;
        const amount = 6;
        store.syncHealth(Math.min(run.health + amount, run.maxHealth + amount), run.maxHealth + amount);
      },
    }),
  },
  {
    id: 'stake_money',
    slot: 'upgrade',
    build: () => ({
      id: 'stake_money',
      slot: 'upgrade',
      label: 'Stake Money',
      description: 'Gain 90 gold.',
      kind: 'instant',
      apply: () => useRunStore.getState().gainGold(90),
    }),
  },
  {
    id: 'supply_satchel',
    slot: 'upgrade',
    build: () => ({
      id: 'supply_satchel',
      slot: 'upgrade',
      label: 'Supply Satchel',
      description: 'Gain 3 random consumables.',
      kind: 'instant',
      apply: (rand) => grantRandomConsumables(rand, 3),
    }),
  },
  {
    id: 'lucky_draw',
    slot: 'upgrade',
    build: () => ({
      id: 'lucky_draw',
      slot: 'upgrade',
      label: 'Lucky Draw',
      description: 'Gain a random common artifact.',
      kind: 'instant',
      apply: (rand) => grantArtifactOfRarity(rand, 'common'),
    }),
  },
];

const SACRIFICES: StarterRewardFactory[] = [
  {
    id: 'blood_price',
    slot: 'sacrifice',
    build: (_seed, run) => ({
      id: 'blood_price',
      slot: 'sacrifice',
      label: 'Blood Price',
      description: `Lose ${getStarterHpSacrificeAmount(run)} HP and gain a random rare artifact.`,
      kind: 'instant',
      apply: (rand) => {
        const store = useRunStore.getState();
        const currentRun = store.run;
        if (!currentRun) return;
        store.updateHealth(-getStarterHpSacrificeAmount(currentRun));
        grantArtifactOfRarity(rand, 'rare');
      },
    }),
  },
  {
    id: 'golden_hunger',
    slot: 'sacrifice',
    build: () => ({
      id: 'golden_hunger',
      slot: 'sacrifice',
      label: 'Golden Hunger',
      description: 'Gain 287 gold and Greed.',
      kind: 'instant',
      artifactKeyword: { text: 'Greed', artifactId: 'greed' },
      apply: () => applyGoldenHunger(),
    }),
  },
  {
    id: 'bone_tax',
    slot: 'sacrifice',
    build: () => ({
      id: 'bone_tax',
      slot: 'sacrifice',
      label: 'Bone Tax',
      description: 'Lose 18 max HP and upgrade 3 random tiles.',
      kind: 'instant',
      apply: (rand) => {
        const store = useRunStore.getState();
        const run = store.run;
        if (!run) return;
        const newMax = Math.max(1, run.maxHealth - 18);
        store.syncHealth(Math.min(run.health, newMax), newMax);
        upgradeRandomTiles(rand, 3);
      },
    }),
  },
  {
    id: 'bargain_bin',
    slot: 'sacrifice',
    build: () => ({
      id: 'bargain_bin',
      slot: 'sacrifice',
      label: 'Bargain Bin',
      description: 'Lose all your gold. The first merchant has all artifacts on sale.',
      kind: 'instant',
      apply: () => {
        const store = useRunStore.getState();
        store.syncGold(0);
        store.setNextMerchantAllArtifactsOnSale(true);
      },
    }),
  },
];

const ALL_STARTER_REWARD_FACTORIES: StarterRewardFactory[] = [...TILE_BOONS, ...UPGRADES, ...SACRIFICES];

function findRewardFactory(id: string): StarterRewardFactory | undefined {
  return ALL_STARTER_REWARD_FACTORIES.find((reward) => reward.id === id);
}

function buildReward(id: string, seed: string, run: RunState): StarterReward | undefined {
  const reward = findRewardFactory(id);
  return reward?.build(seed, run);
}

export function getRewardById(id: string, seed: string, run: RunState): StarterReward | undefined {
  return buildReward(id, seed, run);
}

export interface StarterOffer {
  tile: StarterReward;
  upgrade: StarterReward;
  sacrifice: StarterReward;
}

/** Pick one reward from each pool, deterministically from the run seed. */
export function generateStarterOffer(seed: string, run: RunState): StarterOffer {
  const rand = createSeededRandom(`${seed}-starter`);
  const tile = pickRandom(TILE_BOONS, rand)!.build(seed, run);
  const upgrade = pickRandom(UPGRADES, rand)!.build(seed, run);
  const sacrifice = pickRandom(SACRIFICES, rand)!.build(seed, run);
  return { tile, upgrade, sacrifice };
}

/** Resolve a persisted offer triplet back into full reward objects. */
export function resolveOffer(
  persisted: { tileId: string; upgradeId: string; sacrificeId: string },
  seed: string,
  run: RunState,
): StarterOffer | null {
  const tile = buildReward(persisted.tileId, seed, run);
  const upgrade = buildReward(persisted.upgradeId, seed, run);
  const sacrifice = buildReward(persisted.sacrificeId, seed, run);
  if (!tile || !upgrade || !sacrifice) return null;
  return { tile, upgrade, sacrifice };
}

/** Seed used by the reward apply() calls so random sub-selections are deterministic per run. */
export function makeApplyRand(seed: string, rewardId: string): () => number {
  return createSeededRandom(`${seed}-starter-apply-${rewardId}`);
}
