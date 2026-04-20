import { memo, useEffect, useMemo, useState } from 'react';
import { playMerchant, playUpgrade } from '../../services/sfx';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { ARTIFACTS, RARITY_COLORS_DIM, RARITY_LABELS, RARITY_BREATHE_CLASS } from '../../data/artifacts';
import { CONSUMABLES } from '../../data/consumables';
import { ADDITIONAL_POOL, STARTER_POOL, TILE_DEFINITIONS } from '../../data/tiles';
import { TILE_FRAMES, UI_FRAMES, CONSUMABLE_FRAMES, ARTIFACT_FRAMES } from '../../data/spriteConfig';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { buildTileDescription, buildUpgradePreview, colorizeKeywords, KeywordSubTooltips, getReferencedKeywords } from '../components/KeywordText';
import { createSeededRandom, seededShuffle } from '../../utils/seededRandom';
import { weightedArtifactPickN } from '../../utils/weightedSelection';
import type { TileType, TraitId } from '../../types/game';
import type { Screen } from '../../App';
import { getWantedLevelMutations } from '../../data/wantedLevel';
import { getMaxConsumableSlots } from '../../utils/consumableSlots';
import { rollTileRewardLevel } from '../../utils/tileRewardLevel';

const TRAIT_COLORS: Record<TraitId, string> = {
  outlaw: '#D04040', sheriff: '#6888A0', prospector: '#E0C880', sapper: '#D4A030',
  mustang: '#70B0D0', gunslinger: '#D06080', saloon_keeper: '#D4A870', desperado: '#B060D0',
  sniper: '#7090B8', dead_man_walking: '#808080', tracker: '#C8A040', preacher: '#A0C8FF',
  antivenom: '#60A040', undertaker: '#606060', rattlesnake: '#80C040', corrupt: '#8B3A9B',
};
const TRAIT_NAMES: Record<string, string> = {
  outlaw: 'Outlaw', sheriff: 'Sheriff', prospector: 'Prospector', sapper: 'Sapper',
  mustang: 'Mustang', gunslinger: 'Gunslinger', saloon_keeper: 'Saloon Keeper',
  desperado: 'Desperado', sniper: 'Sniper', dead_man_walking: 'Dead Man Walking',
  tracker: 'Tracker', preacher: 'Preacher', antivenom: 'Antivenom', undertaker: 'Undertaker',
  rattlesnake: 'Rattlesnake', corrupt: 'Corrupt',
};

interface MerchantItem {
  type: 'artifact' | 'consumable' | 'tile_swap' | 'upgrade';
  id: string;
  name: string;
  description: string;
  price: number;
  /** Set when the item is on sale. `price` holds the discounted cost; this
   *  field holds the pre-discount price so the card can strikethrough it. */
  originalPrice?: number;
  tileLevel?: number;
}

export const MerchantScreen = memo(function MerchantScreen() {
  const run = useRunStore((s) => s.run);
  const updateGold = useRunStore((s) => s.updateGold);
  const addArtifact = useRunStore((s) => s.addArtifact);
  const addConsumable = useRunStore((s) => s.addConsumable);
  const swapTileType = useRunStore((s) => s.swapTileType);
  const upgradeTile = useRunStore((s) => s.upgradeTile);
  const addMerchantPurchase = useRunStore((s) => s.addMerchantPurchase);
  const nodeId = run?.currentNodeId;
  const merchantPurchases = useRunStore((s) => s.run?.merchantPurchases);
  const purchased = useMemo(
    () => new Set(nodeId ? (merchantPurchases?.[nodeId] ?? []) : []),
    [merchantPurchases, nodeId],
  );
  const [swapPending, setSwapPending] = useState<MerchantItem | null>(null);
  const [upgradePhase, setUpgradePhase] = useState<'none' | 'selecting' | 'upgraded'>('none');
  const [upgradeSelectedTile, setUpgradeSelectedTile] = useState<TileType | null>(null);
  const [swapSelectedTile, setSwapSelectedTile] = useState<TileType | null>(null);
  const poisonTileBonus = (run?.traitCounts?.rattlesnake ?? 0) >= 2 ? 1 : 0;
  const poisonBonusFor = (t: TileType) => (poisonTileBonus > 0 && (t === 'waste' || t === 'rattler') ? poisonTileBonus : 0);

  useEffect(() => { playMerchant(); }, []);

  // On first visit to this merchant node, save a snapshot of owned artifacts + active tiles.
  // On remount (quit+resume), use the saved snapshot so stock doesn't re-roll.
  const merchantSnapshots = useRunStore((s) => s.run?.merchantSnapshots);
  const setMerchantSnapshot = useRunStore((s) => s.setMerchantSnapshot);

  const snapshot = useMemo(() => {
    if (!run || !nodeId) return null;
    const existing = merchantSnapshots?.[nodeId];
    if (existing) return existing;
    const snap = {
      ownedArtifactIds: run.artifacts.map(a => a.id),
      activeTileTypes: [...run.activeTileTypes],
    };
    setMerchantSnapshot(nodeId, snap);
    return snap;
  }, [nodeId]);

  const stock = useMemo(() => {
    if (!run || !snapshot) return { consumables: [] as MerchantItem[], artifacts: [] as MerchantItem[], tiles: [] as MerchantItem[] };
    const rand = createSeededRandom(`${run.seed}-merchant-${run.currentNodeId}`);
    const ascPriceMult = getWantedLevelMutations(run.wantedLevel).merchantPriceMultiplier;
    // One-shot discount from events (e.g. Train Wreck "Check for survivors"). Consumed on first stock computation.
    const discount = run.nextMerchantDiscount ?? 0;
    // Act-wide surcharge from events (e.g. Medicine Wagon "Threaten him"). Cleared on act advance.
    const surcharge = run.actMerchantSurcharge ?? 0;
    const priceMult = ascPriceMult * (1 - discount) * (1 + surcharge);
    if (discount > 0) useRunStore.getState().setNextMerchantDiscount(undefined);

    const consumables: MerchantItem[] = [];
    const shuffledConsumables = seededShuffle(CONSUMABLES, rand);
    // Shop stocks 3 consumables; price fluctuates +/-5 around each consumable's base cost.
    for (let i = 0; i < Math.min(3, shuffledConsumables.length); i++) {
      const c = shuffledConsumables[i];
      const jitter = Math.floor(rand() * 11) - 5; // [-5, +5]
      const basePrice = Math.max(1, c.cost + jitter);
      consumables.push({
        type: 'consumable',
        id: `cons-${c.id}`,
        name: c.name,
        description: c.effect,
        price: Math.round(basePrice * priceMult),
      });
    }

    const artifacts: MerchantItem[] = [];
    const ownedIds = new Set(snapshot.ownedArtifactIds);
    // Corrupt-tagged artifacts are event-only rewards; never stocked by merchants.
    const availableArtifacts = ARTIFACTS.filter((a) => !ownedIds.has(a.id) && !a.tags.includes('corrupt') && (!a.exclusive || a.exclusive === run.character));
    const desperadoActive = (run.traitCounts?.desperado ?? 0) >= 2;
    const legendaryWeight = getWantedLevelMutations(run.wantedLevel).legendaryWeight;
    const pickedArtifacts = weightedArtifactPickN(availableArtifacts, 4, rand, desperadoActive, legendaryWeight);
    // Rarity-tiered pricing (pre-wanted-level / pre-discount):
    //   Common    100-140
    //   Uncommon  141-180
    //   Rare      181-220
    //   Legendary 261-300
    const RARITY_PRICE: Record<string, { min: number; range: number }> = {
      common: { min: 100, range: 41 },
      uncommon: { min: 141, range: 40 },
      rare: { min: 181, range: 40 },
      legendary: { min: 261, range: 40 },
    };
    // One random artifact in the stock gets a 50%-off SALE tag. L21 disables
    // sales entirely for the rest of the run.
    const salesDisabled = getWantedLevelMutations(run.wantedLevel).disableMerchantSales;
    const saleIndex = !salesDisabled && pickedArtifacts.length > 0
      ? Math.floor(rand() * pickedArtifacts.length)
      : -1;
    for (let i = 0; i < pickedArtifacts.length; i++) {
      const a = pickedArtifacts[i];
      const tier = RARITY_PRICE[a.rarity ?? 'common'] ?? RARITY_PRICE.common;
      const basePrice = tier.min + Math.floor(rand() * tier.range);
      const fullPrice = Math.round(basePrice * priceMult);
      const onSale = i === saleIndex;
      artifacts.push({
        type: 'artifact',
        id: `art-${a.id}`,
        name: a.name,
        description: a.effect,
        price: onSale ? Math.max(1, Math.round(fullPrice * 0.5)) : fullPrice,
        originalPrice: onSale ? fullPrice : undefined,
      });
    }

    const tiles: MerchantItem[] = [];
    const snapTileTypes = snapshot.activeTileTypes;
    const swappableTiles = snapTileTypes.filter(
      (t) => t !== 'tumbleweed' && t !== 'showdown' && t !== 'fools_gold' && t !== 'charcoal',
    );
    if (swappableTiles.length > 0) {
      const tilePool = [...STARTER_POOL, ...ADDITIONAL_POOL];
      const available = tilePool.filter((t) => !snapTileTypes.includes(t));
      // Offer up to 2 distinct swap tiles.
      const picks = seededShuffle(available, rand).slice(0, 2);
      for (const swapTile of picks) {
        const def = TILE_DEFINITIONS[swapTile];
        const tileLevel = rollTileRewardLevel(run.currentAct, run.wantedLevel, rand);
        tiles.push({
          type: 'tile_swap',
          id: `swap-${swapTile}`,
          name: def.label,
          description: def.description,
          price: Math.round((77 + Math.floor(rand() * 40)) * priceMult),
          tileLevel,
        });
      }
    }

    // Upgrade card (base 200, +50 per upgrade already bought this run, once
    // per merchant). L19 wanted-level adds an extra +50 to the base.
    const upgradesBought = run.merchantUpgradesPurchased ?? 0;
    const wl = getWantedLevelMutations(run.wantedLevel);
    const upgradeBase = 200 + wl.merchantUpgradeBasePriceBonus;
    const upgradePrice = Math.round((upgradeBase + 50 * upgradesBought) * priceMult);
    const hasUpgradeableTiles = snapTileTypes.some((t) => TILE_DEFINITIONS[t]?.upgradeText);
    if (hasUpgradeableTiles) {
      tiles.push({
        type: 'upgrade',
        id: 'upgrade',
        name: 'Upgrade',
        description: 'Upgrade a tile permanently.',
        price: upgradePrice,
      });
    }

    return { consumables, artifacts, tiles };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.seed, run?.currentNodeId, run?.character, snapshot]);

  const swappableTiles = useMemo(() => {
    if (!run) return [];
    return run.activeTileTypes.filter(
      (t) => t !== 'tumbleweed' && t !== 'showdown' && t !== 'fools_gold' && t !== 'charcoal',
    );
  }, [run]);

  const handleBuy = (item: MerchantItem) => {
    if (!run || run.gold < item.price || purchased.has(item.id)) return;

    if (item.type === 'tile_swap') {
      setSwapPending(item);
      setSwapSelectedTile(null);
      return;
    }

    if (item.type === 'upgrade') {
      setUpgradePhase('selecting');
      setUpgradeSelectedTile(null);
      return;
    }

    updateGold(-item.price);

    if (item.type === 'artifact') {
      const artifactId = item.id.replace('art-', '');
      const def = ARTIFACTS.find((a) => a.id === artifactId);
      if (def) addArtifact({ id: def.id, tags: def.tags });
    } else if (item.type === 'consumable') {
      const consumableId = item.id.replace('cons-', '');
      addConsumable({ id: consumableId });
    }

    if (run.currentNodeId) addMerchantPurchase(run.currentNodeId, item.id);
  };

  const handleSwapConfirm = (oldTile: TileType) => {
    if (!swapPending || !run) return;
    const newTile = swapPending.id.replace('swap-', '') as TileType;
    updateGold(-swapPending.price);
    swapTileType(oldTile, newTile, swapPending.tileLevel);
    if (run.currentNodeId) addMerchantPurchase(run.currentNodeId, swapPending.id);
    setSwapPending(null);
  };

  const handleUpgradeConfirm = () => {
    if (!run || !upgradeSelectedTile) return;
    const upgradeItem = stock.tiles.find((t) => t.type === 'upgrade');
    if (!upgradeItem || run.gold < upgradeItem.price) return;
    updateGold(-upgradeItem.price);
    upgradeTile(upgradeSelectedTile);
    playUpgrade();
    if (run.currentNodeId) addMerchantPurchase(run.currentNodeId, 'upgrade');
    useRunStore.getState().incrementMerchantUpgradesPurchased();
    setUpgradePhase('upgraded');
  };

  const handleLeave = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  if (!run) return null;

  const maxSlots = getMaxConsumableSlots(run);

  return (
    <div className="flex flex-col items-center justify-center h-full" style={{ padding: '24px 0', backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${import.meta.env.BASE_URL}assets/backgrounds/merchant_bg.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <h2 className="text-xl text-amber-400 mb-4 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>General Merchant</h2>

      <div className="flex flex-col gap-4 px-2">
        {/* Row 1: Artifacts | Upgrade */}
        <div className="flex gap-2">
          <Section title="Artifacts">
            {stock.artifacts.map((item) => {
              const isSold = purchased.has(item.id);
              const canAfford = run.gold >= item.price;
              const artId = item.id.replace('art-', '');
              const artFrame = ARTIFACT_FRAMES[artId];
              const artDef = ARTIFACTS.find(a => a.id === artId);
              const tags = artDef?.tags ?? [];
              const traitTooltip = tags.length > 0 ? (
                <span style={{ fontSize: '9px' }}>
                  <span className="text-stone-400">Traits: </span>
                  {tags.map((tag, i) => (
                    <span key={tag}>
                      {i > 0 && <span className="text-stone-500">, </span>}
                      <span style={{ color: TRAIT_COLORS[tag] }}>{TRAIT_NAMES[tag]}</span>
                    </span>
                  ))}
                </span>
              ) : undefined;
              const iconEl = artFrame != null ? <SpriteIcon frame={artFrame} scale={2} /> : <span className="text-lg text-purple-400">{'\u2726'}</span>;
              return (
                <Tooltip key={item.id} content={traitTooltip} position="bottom" gap={30}>
                  <MerchantCard
                    icon={iconEl}
                    name={item.name}
                    nameClass={`text-xs ${RARITY_BREATHE_CLASS[artDef?.rarity ?? 'common']}`}
                    subtitle={RARITY_LABELS[artDef?.rarity ?? 'common']}
                    subtitleColor={RARITY_COLORS_DIM[artDef?.rarity ?? 'common']}
                    description={<>{colorizeKeywords(item.description)}</>}
                    price={item.price}
                    originalPrice={item.originalPrice}
                    sold={isSold}
                    disabled={isSold || !canAfford}
                    onClick={() => handleBuy(item)}
                  />
                </Tooltip>
              );
            })}
          </Section>

          <Section title="Upgrade">
            {(() => {
              const upgradeItem = stock.tiles.find((t) => t.type === 'upgrade');
              if (!upgradeItem) return null;
              const isSold = purchased.has(upgradeItem.id);
              const canAfford = run.gold >= upgradeItem.price;
              return (
                <MerchantCard
                  icon={<SpriteIcon frame={UI_FRAMES.upgrade} scale={2} />}
                  name={upgradeItem.name}
                  description={upgradeItem.description}
                  price={upgradeItem.price}
                  sold={isSold}
                  disabled={isSold || !canAfford}
                  onClick={() => handleBuy(upgradeItem)}
                />
              );
            })()}
          </Section>
        </div>

        {/* Row 2: Consumables | Tiles */}
        <div className="flex gap-2">
          <Section title="Consumables">
            {stock.consumables.map((item) => {
              const isSold = purchased.has(item.id);
              const canAfford = run.gold >= item.price;
              const full = run.consumables.length >= maxSlots;
              const consId = item.id.replace('cons-', '');
              const frame = CONSUMABLE_FRAMES[consId];
              return (
                <MerchantCard
                  key={item.id}
                  icon={frame != null ? <SpriteIcon frame={frame} scale={2} /> : <span className="text-lg text-green-400">{'\u2764'}</span>}
                  name={item.name}
                  description={<>{colorizeKeywords(item.description)}</>}
                  price={item.price}
                  sold={isSold}
                  disabled={isSold || !canAfford || full}
                  onClick={() => handleBuy(item)}
                />
              );
            })}
          </Section>

          <Section title="Tiles">
            {stock.tiles.filter((t) => t.type === 'tile_swap').map((tileItem) => {
              const isSold = purchased.has(tileItem.id);
              const canAfford = run.gold >= tileItem.price;
              const tileType = tileItem.id.replace('swap-', '') as TileType;
              const def = TILE_DEFINITIONS[tileType];
              const level = tileItem.tileLevel ?? 0;
              const upgradeTooltip = def.upgradeText ? (
                <div className="whitespace-nowrap" style={{ fontSize: '8px', lineHeight: 1.3 }}>
                  <span className="text-stone-400 font-bold">Upgrade</span>
                  <span className="text-stone-400"> - </span>
                  <span className="text-amber-300">{def.upgradeText}</span>
                </div>
              ) : undefined;
              const hasKeywords = getReferencedKeywords(def.description).length > 0;
              const keywordTooltip = hasKeywords ? <KeywordSubTooltips text={def.description} /> : undefined;
              return (
                <Tooltip key={tileItem.id} content={upgradeTooltip} secondContent={keywordTooltip} position="bottom" gap={30}>
                  <MerchantCard
                    icon={<SpriteIcon frame={TILE_FRAMES[tileType]} scale={2} />}
                    name={tileItem.name}
                    subtitle={level > 0 ? `Lv ${level + 1}` : undefined}
                    description={<>{buildTileDescription(tileType, level)}</>}
                    price={tileItem.price}
                    sold={isSold}
                    disabled={isSold || !canAfford}
                    onClick={() => handleBuy(tileItem)}
                  />
                </Tooltip>
              );
            })}
          </Section>
        </div>
      </div>

      <button
        onClick={handleLeave}
        style={{ boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
        className="mt-4 px-6 py-2 text-sm rounded-sm bg-stone-800 text-stone-300 hover:bg-stone-700 transition-transform active:translate-y-0.5"
      >
        Leave
      </button>

      {/* Tile swap picker overlay */}
      {swapPending && (() => {
        const newTileType = swapPending.id.replace('swap-', '') as TileType;
        const newDef = TILE_DEFINITIONS[newTileType];
        const newLevel = swapPending.tileLevel ?? 0;
        return (
          <div className="absolute inset-0 flex flex-col bg-black/80 z-10">
            <div className="flex-1 flex flex-col items-center justify-center">
              <h2 className="text-xl text-amber-400 mb-2 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Choose Tile to Swap Out</h2>
              <p className="text-stone-400 text-xs mb-4">Choose a tile to replace with the tile on the right.</p>

              <div className="flex items-center gap-6">
                {/* Current tiles grid */}
                <div className="grid grid-cols-4 gap-2">
                  {swappableTiles.map((tileType) => {
                    const def = TILE_DEFINITIONS[tileType];
                    const baseLevel = run?.tileUpgrades[tileType] ?? 0;
                    const tBonus = poisonBonusFor(tileType);
                    const level = baseLevel + tBonus;
                    const isSelected = swapSelectedTile === tileType;
                    return (
                      <button
                        key={tileType}
                        onClick={() => setSwapSelectedTile(tileType)}
                        className="flex flex-col items-center w-28 rounded-sm transition-all"
                        style={{
                          backgroundColor: isSelected ? 'rgba(120, 53, 15, 0.75)' : 'rgba(28, 25, 23, 0.8)',
                          padding: '8px 6px',
                          transform: isSelected ? 'translateY(-4px)' : 'none',
                          boxShadow: '3px 3px 2px rgba(0,0,0,0.7)',
                        }}
                      >
                        <SpriteIcon frame={TILE_FRAMES[tileType]} scale={2} className="mb-1.5" />
                        <span className="text-amber-300 text-xs font-bold" style={{ fontSize: def.label.length > 13 ? '10px' : undefined }}>{def.label}</span>
                        <span className="text-yellow-400" style={{ fontSize: '8px' }}>Lv {baseLevel + 1}{tBonus > 0 ? ` (+${tBonus})` : ''}</span>
                        <span className="text-stone-300 text-center mt-1 leading-tight" style={{ fontSize: '9px' }}>
                          {buildTileDescription(tileType, level)}
                        </span>
                        {def.flavor && (
                          <span className="text-stone-600 text-center mt-1 leading-tight italic" style={{ fontSize: '8px' }}>
                            "{def.flavor}"
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Arrow */}
                <span className="text-amber-400 text-2xl font-bold">{'\u2190'}</span>

                {/* New tile (non-interactable card, same size as left) */}
                <div
                  className="flex flex-col items-center w-28 rounded-sm relative"
                  style={{
                    backgroundColor: 'rgba(120, 53, 15, 0.55)',
                    padding: '8px 6px',
                    boxShadow: '3px 3px 2px rgba(0,0,0,0.7)',
                  }}
                >
                  <span className="absolute top-1 right-1.5 text-yellow-400 font-bold" style={{ fontSize: '10px' }}>
                    {swapPending.price}g
                  </span>
                  <SpriteIcon frame={TILE_FRAMES[newTileType]} scale={2} className="mb-1.5" />
                  <span className="text-amber-300 text-xs font-bold" style={{ fontSize: newDef.label.length > 13 ? '10px' : undefined }}>{newDef.label}</span>
                  {(() => {
                    const nBonus = poisonBonusFor(newTileType);
                    return (newLevel > 0 || nBonus > 0) ? (
                      <span className="text-yellow-400" style={{ fontSize: '8px' }}>Lv {newLevel + 1}{nBonus > 0 ? ` (+${nBonus})` : ''}</span>
                    ) : null;
                  })()}
                  <span className="text-stone-300 text-center mt-1 leading-tight" style={{ fontSize: '9px' }}>
                    {buildTileDescription(newTileType, newLevel + poisonBonusFor(newTileType))}
                  </span>
                  {newDef.flavor && (
                    <span className="text-stone-600 text-center mt-1 leading-tight italic" style={{ fontSize: '8px' }}>
                      "{newDef.flavor}"
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setSwapPending(null)}
                  style={{ boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
                  className="px-4 py-2 text-sm rounded-sm bg-stone-800 text-stone-300 hover:bg-stone-700 transition-transform active:translate-y-0.5"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { if (swapSelectedTile) handleSwapConfirm(swapSelectedTile); }}
                  disabled={!swapSelectedTile}
                  style={{ boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
                  className={`px-6 py-2 text-sm rounded-sm transition-transform ${
                    swapSelectedTile
                      ? 'bg-amber-800 text-amber-200 hover:bg-amber-700 active:translate-y-0.5'
                      : 'bg-stone-800 text-stone-600 cursor-not-allowed opacity-70'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Upgrade: tile selection (same layout as campfire) */}
      {upgradePhase === 'selecting' && (
        <div className="absolute inset-0 flex flex-col bg-black/80 z-10">
          <div className="flex-1 flex flex-col items-center justify-center">
            <h2 className="text-xl text-amber-400 mb-2 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Upgrade a Tile</h2>
            <p className="text-stone-400 text-xs mb-4">Permanent +1 tier for the rest of the run</p>

            <div className="grid grid-cols-4 gap-3 justify-items-center">
              {run.activeTileTypes
                .filter((t) => TILE_DEFINITIONS[t]?.upgradeText)
                .map((tileType) => {
                  const def = TILE_DEFINITIONS[tileType];
                  const currentLevel = run.tileUpgrades[tileType] ?? 0;
                  const isSelected = upgradeSelectedTile === tileType;
                  const previewTooltip = (
                    <div className="whitespace-nowrap" style={{ fontSize: '9px', lineHeight: 1.3 }}>
                      {buildUpgradePreview(tileType, currentLevel)}
                    </div>
                  );
                  return (
                    <Tooltip key={tileType} content={previewTooltip} position="bottom" gap={30}>
                      <button
                        onClick={() => setUpgradeSelectedTile(tileType)}
                        className="flex flex-col items-center w-28 rounded-sm transition-all"
                        style={{
                          backgroundColor: isSelected ? 'rgba(120, 53, 15, 0.75)' : 'rgba(28, 25, 23, 0.8)',
                          padding: '12px 10px',
                          transform: isSelected ? 'translateY(-4px)' : 'none',
                          boxShadow: '3px 3px 2px rgba(0,0,0,0.7)',
                        }}
                      >
                        <SpriteIcon frame={TILE_FRAMES[tileType]} scale={2} className="mb-1" />
                        <span className="text-amber-300 text-xs font-bold" style={{ fontSize: def.label.length > 13 ? '10px' : undefined }}>{def.label}</span>
                        <span className="text-yellow-400" style={{ fontSize: '8px' }}>
                          Lv {currentLevel + 1} {'\u2192'} {currentLevel + 2}{poisonBonusFor(tileType) > 0 ? ` (+${poisonBonusFor(tileType)})` : ''}
                        </span>
                        <span className="text-stone-500 text-center" style={{ fontSize: '9px' }}>
                          {def.upgradeText}
                        </span>
                      </button>
                    </Tooltip>
                  );
                })}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setUpgradePhase('none')}
                style={{ boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
                className="px-4 py-2 text-sm rounded-sm bg-stone-800 text-stone-300 hover:bg-stone-700 transition-transform active:translate-y-0.5"
              >
                Back
              </button>
              <button
                onClick={handleUpgradeConfirm}
                disabled={!upgradeSelectedTile}
                style={{ boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
                className={`px-6 py-2 text-sm rounded-sm transition-transform ${
                  upgradeSelectedTile
                    ? 'bg-amber-800 text-amber-200 hover:bg-amber-700 active:translate-y-0.5'
                    : 'bg-stone-800 text-stone-600 cursor-not-allowed opacity-70'
                }`}
              >
                Upgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade: confirmation (same layout as campfire) */}
      {upgradePhase === 'upgraded' && (() => {
        const tileDef = upgradeSelectedTile ? TILE_DEFINITIONS[upgradeSelectedTile] : null;
        return (
          <div className="absolute inset-0 flex flex-col bg-black/80 z-10">
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="mb-4"><SpriteIcon frame={UI_FRAMES.upgrade} scale={3} /></div>
              <h2 className="text-xl text-amber-400 mb-2 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Upgraded</h2>
              <p className="text-stone-300 text-sm mb-4">
                {tileDef?.label ?? 'Tile'} has been upgraded.
              </p>
              <button
                onClick={() => setUpgradePhase('none')}
                style={{ boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
                className="px-6 py-2 text-sm rounded-sm bg-amber-800 text-amber-200 hover:bg-amber-700 transition-transform active:translate-y-0.5"
              >
                Back to Merchant
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs text-stone-500 uppercase tracking-wider mb-1.5">{title}</h3>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

function MerchantCard({
  icon,
  name,
  nameClass,
  subtitle,
  subtitleColor,
  description,
  price,
  originalPrice,
  sold,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  name: string;
  nameClass?: string;
  subtitle?: string;
  subtitleColor?: string;
  description: React.ReactNode;
  price: number;
  /** When set, the card shows a strikethrough original + discounted price + SALE badge. */
  originalPrice?: number;
  sold: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const onSale = !sold && originalPrice != null && originalPrice > price;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center w-36 h-40 rounded-sm text-center transition-transform active:translate-y-0.5 ${
        sold
          ? 'opacity-40 cursor-not-allowed'
          : disabled
            ? 'opacity-60 cursor-not-allowed'
            : 'hover:-translate-y-0.5'
      }`}
      style={{
        backgroundColor: sold || disabled ? 'rgba(28, 25, 23, 0.5)' : 'rgba(28, 25, 23, 0.8)',
        padding: '12px 10px',
        boxShadow: '3px 3px 2px rgba(0,0,0,0.7)',
      }}
    >
      {onSale && (
        <span
          className="absolute top-1 left-1.5 font-bold"
          style={{
            fontSize: '9px',
            color: '#f87171',
            WebkitTextStroke: '2px #000',
            paintOrder: 'stroke fill',
            letterSpacing: '0.5px',
          }}
        >
          SALE
        </span>
      )}
      <span className="absolute top-1 right-1.5 font-bold flex flex-col items-end leading-none" style={{ fontSize: '10px' }}>
        {sold ? (
          <span className="text-yellow-400">SOLD</span>
        ) : onSale ? (
          <>
            <span className="text-stone-500 line-through" style={{ fontSize: '8px' }}>
              {originalPrice}g
            </span>
            <span className="text-yellow-400 mt-px">{price}g</span>
          </>
        ) : (
          <span className="text-yellow-400">{price}g</span>
        )}
      </span>
      <div className="mb-1.5">{icon}</div>
      <span className={nameClass ?? 'text-amber-300 text-xs font-bold'}>{name}</span>
      {subtitle && (
        <span style={{ fontSize: '7px', color: subtitleColor ?? '#d4a030' }}>{subtitle}</span>
      )}
      <span className="text-stone-400 text-center mt-1 leading-tight" style={{ fontSize: '9px' }}>
        {description}
      </span>
    </button>
  );
}
