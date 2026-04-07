import { memo, useEffect, useMemo, useState } from 'react';
import { playMerchant, playUpgrade } from '../../services/sfx';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { ARTIFACTS } from '../../data/artifacts';
import { CONSUMABLES } from '../../data/consumables';
import { ADDITIONAL_POOL, STARTER_POOL, TILE_DEFINITIONS } from '../../data/tiles';
import { TILE_FRAMES, UI_FRAMES, CONSUMABLE_FRAMES, ARTIFACT_FRAMES } from '../../data/spriteConfig';
import { SpriteIcon } from '../components/SpriteIcon';
import { Tooltip } from '../components/Tooltip';
import { KeywordSubTooltips, getReferencedKeywords, buildTileDescription, buildUpgradePreview, colorizeKeywords } from '../components/KeywordText';
import { createSeededRandom, seededShuffle } from '../../utils/seededRandom';
import type { TileType } from '../../types/game';
import type { Screen } from '../../App';
import { getAscensionModifiers } from '../../data/ascension';

interface MerchantItem {
  type: 'artifact' | 'consumable' | 'tile_swap' | 'upgrade';
  id: string;
  name: string;
  description: string;
  price: number;
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

  useEffect(() => { playMerchant(); }, []);

  const stock = useMemo(() => {
    if (!run) return { consumables: [] as MerchantItem[], artifacts: [] as MerchantItem[], tiles: [] as MerchantItem[] };
    const rand = createSeededRandom(`${run.seed}-merchant-${run.currentNodeId}`);
    const priceMult = getAscensionModifiers(run.ascensionLevel).merchantPriceMultiplier;

    const consumables: MerchantItem[] = [];
    const shuffledConsumables = seededShuffle(CONSUMABLES, rand);
    for (let i = 0; i < Math.min(3, shuffledConsumables.length); i++) {
      const c = shuffledConsumables[i];
      consumables.push({
        type: 'consumable',
        id: `cons-${c.id}`,
        name: c.name,
        description: c.effect,
        price: Math.round((15 + Math.floor(rand() * 16)) * priceMult),
      });
    }

    const artifacts: MerchantItem[] = [];
    const ownedIds = new Set(run.artifacts.map((a) => a.id));
    const availableArtifacts = ARTIFACTS.filter((a) => !ownedIds.has(a.id) && (!a.exclusive || a.exclusive === run.character));
    const shuffledArtifacts = seededShuffle(availableArtifacts, rand);
    for (let i = 0; i < Math.min(3, shuffledArtifacts.length); i++) {
      const a = shuffledArtifacts[i];
      artifacts.push({
        type: 'artifact',
        id: `art-${a.id}`,
        name: a.name,
        description: a.effect,
        price: Math.round((100 + Math.floor(rand() * 76)) * priceMult),
      });
    }

    const tiles: MerchantItem[] = [];
    const swappableTiles = run.activeTileTypes.filter(
      (t) => t !== 'tumbleweed' && t !== 'showdown' && t !== 'fools_gold',
    );
    if (swappableTiles.length > 0) {
      const available = [...STARTER_POOL, ...ADDITIONAL_POOL].filter((t) => !run.activeTileTypes.includes(t));
      if (available.length > 0) {
        const swapTile = seededShuffle(available, rand)[0];
        const def = TILE_DEFINITIONS[swapTile];
        let tileLevel = 0;
        if (run.currentAct === 2) tileLevel = rand() < 0.8 ? 1 : 2;
        else if (run.currentAct === 3) tileLevel = rand() < 0.8 ? 2 : 3;
        tiles.push({
          type: 'tile_swap',
          id: `swap-${swapTile}`,
          name: def.label,
          description: def.description,
          price: Math.round((50 + Math.floor(rand() * 26)) * priceMult),
          tileLevel,
        });
      }
    }

    // Upgrade card (250g, once per merchant)
    const upgradePrice = Math.round(250 * priceMult);
    const hasUpgradeableTiles = run.activeTileTypes.some((t) => TILE_DEFINITIONS[t]?.upgradeText);
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
  }, [run?.seed, run?.currentNodeId, run?.character]);

  const swappableTiles = useMemo(() => {
    if (!run) return [];
    return run.activeTileTypes.filter(
      (t) => t !== 'tumbleweed' && t !== 'showdown' && t !== 'fools_gold',
    );
  }, [run]);

  const handleBuy = (item: MerchantItem) => {
    if (!run || run.gold < item.price || purchased.has(item.id)) return;

    if (item.type === 'tile_swap') {
      setSwapPending(item);
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
    setUpgradePhase('upgraded');
  };

  const handleLeave = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  if (!run) return null;

  const hasSaddlebag = run.artifacts.some((a) => a.id === 'saddlebag');
  const maxSlots = hasSaddlebag ? 4 : 3;

  return (
    <div className="flex flex-col items-center justify-center h-full" style={{ padding: '24px 0', backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${import.meta.env.BASE_URL}assets/merchant_bg.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <h2 className="text-xl text-amber-400 mb-4 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>General Merchant</h2>

      <div className="flex flex-col gap-4 px-2">
        {/* Row 1: Artifacts | Tile */}
        <div className="flex gap-2">
          <Section title="Artifacts">
            {stock.artifacts.map((item) => {
              const isSold = purchased.has(item.id);
              const canAfford = run.gold >= item.price;
              const artId = item.id.replace('art-', '');
              const artFrame = ARTIFACT_FRAMES[artId];
              return (
                <MerchantCard
                  key={item.id}
                  icon={artFrame != null ? <SpriteIcon frame={artFrame} scale={2} /> : <span className="text-lg text-purple-400">{'\u2726'}</span>}
                  name={item.name}
                  description={item.description}
                  price={item.price}
                  sold={isSold}
                  disabled={isSold || !canAfford}
                  onClick={() => handleBuy(item)}
                />
              );
            })}
          </Section>

          <Section title="Tile">
            {(() => {
              const tileItem = stock.tiles.find((t) => t.type === 'tile_swap');
              if (!tileItem) return null;
              const isSold = purchased.has(tileItem.id);
              const canAfford = run.gold >= tileItem.price;
              const tileType = tileItem.id.replace('swap-', '') as TileType;
              const def = TILE_DEFINITIONS[tileType];
              const level = tileItem.tileLevel ?? 0;
              const hasKeywords = getReferencedKeywords(def.description).length > 0;
              const keywordTooltip = hasKeywords ? <KeywordSubTooltips text={def.description} /> : undefined;
              const upgradeTooltip = def.upgradeText ? (
                <div className="whitespace-nowrap" style={{ fontSize: '8px', lineHeight: 1.3 }}>
                  <span className="text-stone-400 font-bold">Upgrade</span>
                  <span className="text-stone-400"> - </span>
                  <span className="text-amber-300">{def.upgradeText}</span>
                </div>
              ) : undefined;
              return (
                <Tooltip content={keywordTooltip} secondContent={upgradeTooltip} position="bottom">
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
            })()}
          </Section>
        </div>

        {/* Row 2: Consumables | Upgrade */}
        <div className="flex gap-2">
          <Section title="Consumables">
            {stock.consumables.map((item) => {
              const isSold = purchased.has(item.id);
              const canAfford = run.gold >= item.price;
              const full = run.consumables.length >= maxSlots;
              const consId = item.id.replace('cons-', '');
              const frame = CONSUMABLE_FRAMES[consId];
              const hasKeywords = getReferencedKeywords(item.description).length > 0;
              const keywordTooltip = hasKeywords ? <KeywordSubTooltips text={item.description} /> : undefined;
              return (
                <Tooltip key={item.id} content={keywordTooltip} position="bottom">
                  <MerchantCard
                    icon={frame != null ? <SpriteIcon frame={frame} scale={2} /> : <span className="text-lg text-green-400">{'\u2764'}</span>}
                    name={item.name}
                    description={<>{colorizeKeywords(item.description)}</>}
                    price={item.price}
                    sold={isSold}
                    disabled={isSold || !canAfford || full}
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
      </div>

      <button
        onClick={handleLeave}
        className="mt-4 px-6 py-2 bg-stone-700/80 text-stone-300 text-sm border border-stone-600 hover:bg-stone-600/50"
      >
        Leave
      </button>

      {/* Tile swap picker overlay */}
      {swapPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
          <div className="bg-[#1a1a2e] border border-stone-600 p-4 w-72">
            <h3 className="text-sm text-amber-400 mb-1">Choose tile to swap away</h3>
            <p className="text-xs text-stone-400 mb-3">
              Replacing with{' '}
              <span className="text-blue-300">
                {TILE_DEFINITIONS[swapPending.id.replace('swap-', '') as TileType].label}
              </span>{' '}
              for <span className="text-yellow-400">{swapPending.price}g</span>
            </p>
            <div className="flex flex-col gap-2 mb-3">
              {swappableTiles.map((tile) => {
                const def = TILE_DEFINITIONS[tile];
                const level = run?.tileUpgrades[tile] ?? 0;
                const hasKeywords = getReferencedKeywords(def.description).length > 0;
                const keywordTooltip = hasKeywords ? <KeywordSubTooltips text={def.description} /> : undefined;
                const upgradeTooltip = def.upgradeText ? (
                  <div className="whitespace-nowrap" style={{ fontSize: '8px', lineHeight: 1.3 }}>
                    <span className="text-stone-400 font-bold">Upgrade</span>
                    <span className="text-stone-400"> - </span>
                    <span className="text-amber-300">{def.upgradeText}</span>
                  </div>
                ) : undefined;
                return (
                  <Tooltip key={tile} content={keywordTooltip} secondContent={upgradeTooltip} position="bottom">
                    <button
                      onClick={() => handleSwapConfirm(tile)}
                      className="flex items-center gap-2 p-2 border border-stone-600 bg-stone-800/80 hover:border-amber-600 hover:bg-stone-700/80 text-left w-full"
                    >
                      <SpriteIcon frame={TILE_FRAMES[tile]} scale={1} />
                      <span className="text-stone-200 text-sm">{def.label}</span>
                      <span className="text-amber-400" style={{ fontSize: '10px' }}>Lv {level + 1}</span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
            <button
              onClick={() => setSwapPending(null)}
              className="w-full px-4 py-1.5 bg-stone-700/80 text-stone-400 text-xs border border-stone-600 hover:bg-stone-600/50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Upgrade: tile selection (same layout as campfire) */}
      {upgradePhase === 'selecting' && (
        <div className="absolute inset-0 flex flex-col bg-[#1a1a2e]/95 z-10">
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
                  const hasKeywords = getReferencedKeywords(def.description).length > 0;
                  const keywordTooltip = hasKeywords ? <KeywordSubTooltips text={def.description} /> : undefined;
                  return (
                    <Tooltip key={tileType} content={previewTooltip} secondContent={keywordTooltip} position="bottom">
                      <button
                        onClick={() => setUpgradeSelectedTile(tileType)}
                        className={`flex flex-col items-center p-3 w-28 border-2 transition-colors ${
                          isSelected
                            ? 'border-amber-400 bg-amber-900/50'
                            : 'border-stone-600 bg-stone-800/80 hover:border-stone-400'
                        }`}
                      >
                        <SpriteIcon frame={TILE_FRAMES[tileType]} scale={2} className="mb-1" />
                        <span className="text-amber-300 text-xs font-bold">{def.label}</span>
                        <span className="text-stone-400" style={{ fontSize: '10px' }}>
                          Lv {currentLevel + 1} {'\u2192'} {currentLevel + 2}
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
                className="px-4 py-2 bg-stone-700/80 text-stone-400 text-sm border border-stone-600 hover:bg-stone-600/50"
              >
                Back
              </button>
              <button
                onClick={handleUpgradeConfirm}
                disabled={!upgradeSelectedTile}
                className={`px-6 py-2 text-sm border ${
                  upgradeSelectedTile
                    ? 'bg-amber-900/60 text-amber-300 border-amber-700 hover:bg-amber-800/60'
                    : 'bg-stone-700/80 text-stone-500 border-stone-600 cursor-not-allowed'
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
          <div className="absolute inset-0 flex flex-col bg-[#1a1a2e]/95 z-10">
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="mb-4"><SpriteIcon frame={UI_FRAMES.upgrade} scale={3} /></div>
              <h2 className="text-xl text-amber-400 mb-2 font-bold uppercase" style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>Upgraded</h2>
              <p className="text-stone-300 text-sm mb-4">
                {tileDef?.label ?? 'Tile'} has been upgraded.
              </p>
              <button
                onClick={() => setUpgradePhase('none')}
                className="px-6 py-2 bg-amber-900/60 text-amber-300 text-sm border border-amber-700 hover:bg-amber-800/60"
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
  subtitle,
  description,
  price,
  sold,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  name: string;
  subtitle?: string;
  description: React.ReactNode;
  price: number;
  sold: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center p-3 w-36 h-40 border-2 text-center transition-colors ${
        sold
          ? 'border-stone-700 bg-stone-800/30 opacity-40'
          : disabled
            ? 'border-stone-700 bg-stone-800/30 opacity-60 cursor-not-allowed'
            : 'border-stone-600 bg-stone-800/80 hover:border-amber-600 hover:bg-stone-700/80'
      }`}
    >
      <span className="absolute top-1 right-1.5 text-yellow-400 font-bold" style={{ fontSize: '10px' }}>
        {sold ? 'SOLD' : `${price}g`}
      </span>
      <div className="mb-1.5">{icon}</div>
      <span className="text-amber-300 text-xs font-bold">{name}</span>
      {subtitle && (
        <span className="text-amber-400" style={{ fontSize: '10px' }}>{subtitle}</span>
      )}
      <span className="text-stone-400 text-center mt-1 leading-tight" style={{ fontSize: '9px' }}>
        {description}
      </span>
    </button>
  );
}
