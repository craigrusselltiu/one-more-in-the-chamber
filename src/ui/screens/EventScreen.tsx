import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';
import { pickEventFromBag, type EventChoice } from '../../data/events';
import { createSeededRandom, seededShuffle } from '../../utils/seededRandom';
import { pauseRunPersistence, resumeRunPersistence, forceSaveRun } from '../../services/runPersistence';
import { SpriteIcon } from '../components/SpriteIcon';
import { UI_FRAMES, ARTIFACT_FRAMES, CONSUMABLE_FRAMES, TILE_FRAMES } from '../../data/spriteConfig';
import { ARTIFACTS, RARITY_COLORS_DIM, type ArtifactDefinition } from '../../data/artifacts';
import { pickArtifactForRun, pickArtifactByTag } from '../../utils/artifactSelection';
import { adjustHeal } from '../../utils/healAdjust';
import { CONSUMABLES } from '../../data/consumables';
import { TILE_DEFINITIONS } from '../../data/tiles';
import { renderNarrativeText } from '../components/AnimatedNarrativeText';
import { playUpgrade } from '../../services/sfx';
import type { RunState, TraitId } from '../../types/game';
import type { Screen } from '../../App';

type Phase = 'choose' | 'preview' | 'settle' | 'shuffle' | 'pick' | 'reveal-picked' | 'reveal' | 'result';

type GameType = 'gold' | 'item' | 'health';

type Reward =
  | { kind: 'gold'; amount: number }
  | { kind: 'artifact'; id: string; tags: TraitId[] }
  | { kind: 'consumables'; ids: string[] }
  | { kind: 'lose_hp'; amount: number }
  | { kind: 'max_hp'; amount: number }
  | { kind: 'heal_full' };

const PLAY_COST = 40;
const PREVIEW_MS = 1500;
const SETTLE_MS = 1000;
const SHUFFLE_MS = 2000;
const SHUFFLE_INTERVAL_MS = 70;
const SLOT_OFFSETS_PX = [-150, 0, 150];
const CARD_W = 120;
const CARD_H = 180;

/** Abandoned Mine: each step drills deeper, risking more HP for a better artifact roll. */
const MINE_LEVELS: Array<{ label: string; description: string; hpPct: number; chance: number; hpBase: 'max' | 'current' }> = [
  { label: 'Investigate', description: 'Lose 3% max HP for artifact chance. (10%)', hpPct: 0.03, chance: 0.10, hpBase: 'max' },
  { label: 'Go deeper', description: 'Lose 5% max HP for artifact chance. (20%)', hpPct: 0.05, chance: 0.20, hpBase: 'max' },
  { label: 'Go deeper', description: 'Lose 7% HP for artifact chance. (30%)', hpPct: 0.07, chance: 0.30, hpBase: 'current' },
  { label: 'Go deeper', description: 'Lose 10% HP for artifact. (50%)', hpPct: 0.10, chance: 0.50, hpBase: 'current' },
  { label: 'Go deeper', description: 'Lose 15% HP for artifact. (100%)', hpPct: 0.15, chance: 1.00, hpBase: 'current' },
];

function generateRewards(
  gameType: GameType,
  rand: () => number,
  run: RunState,
): Reward[] {
  switch (gameType) {
    case 'gold':
      return [
        { kind: 'gold', amount: 0 },
        { kind: 'gold', amount: 39 },
        { kind: 'gold', amount: 267 },
      ];
    case 'item': {
      const owned = new Set(run.artifacts.map((a) => a.id));
      const character = run.character;
      // Corrupt-tagged artifacts are event-granted only; exclude from the card-game spread.
      const nonCorrupt = ARTIFACTS.filter((a) => !a.tags.includes('corrupt'));
      const available = nonCorrupt.filter(
        (a) => !owned.has(a.id) && (!a.exclusive || a.exclusive === character),
      );
      const pool = available.length > 0 ? available : nonCorrupt;
      const legendaries = pool.filter((a) => a.rarity === 'legendary');
      const commons = pool.filter((a) => (a.rarity ?? 'common') === 'common');
      const pickFrom = (arr: ArtifactDefinition[]) => arr[Math.floor(rand() * arr.length)];
      const legendary = legendaries.length > 0 ? pickFrom(legendaries) : pickFrom(pool);
      const common = commons.length > 0 ? pickFrom(commons) : pickFrom(pool);
      const consumablePool = CONSUMABLES.map((c) => c.id);
      const consumableIds: string[] = [];
      for (let i = 0; i < 3 && consumablePool.length > 0; i++) {
        const idx = Math.floor(rand() * consumablePool.length);
        consumableIds.push(consumablePool[idx]);
        consumablePool.splice(idx, 1);
      }
      return [
        { kind: 'artifact', id: legendary.id, tags: legendary.tags },
        { kind: 'consumables', ids: consumableIds },
        { kind: 'artifact', id: common.id, tags: common.tags },
      ];
    }
    case 'health':
      return [
        { kind: 'lose_hp', amount: 7 },
        { kind: 'max_hp', amount: 5 },
        { kind: 'heal_full' },
      ];
  }
}

export const EventScreen = memo(function EventScreen() {
  const run = useRunStore((s) => s.run);
  const updateGold = useRunStore((s) => s.updateGold);
  const gainGold = useRunStore((s) => s.gainGold);
  const updateHealth = useRunStore((s) => s.updateHealth);
  const syncHealth = useRunStore((s) => s.syncHealth);
  const addArtifact = useRunStore((s) => s.addArtifact);
  const addConsumable = useRunStore((s) => s.addConsumable);
  const setEventBag = useRunStore((s) => s.setEventBag);
  const setPendingEventResumeScreen = useRunStore((s) => s.setPendingEventResumeScreen);

  const { event, newBag } = useMemo(() =>
    pickEventFromBag(
      run?.currentAct ?? 1,
      `${run?.seed ?? ''}-event-${run?.currentNodeId ?? ''}`,
      run?.eventBag ?? [],
    ),
    // Keep the draw stable per node; eventBag changes are applied via effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run?.currentAct, run?.seed, run?.currentNodeId],
  );

  // Save on entry (captures the pre-choice checkpoint) and snapshot the pre-event
  // run state in memory. Pause auto-save while the player is inside the event.
  // On unmount, if the player did not complete the event (quit to main menu),
  // roll the in-memory run back to the snapshot so gold/HP/artifacts/consumables
  // spent on the now-cancelled choice don't leak into the next session.
  const preEventRunRef = useRef<RunState | null>(null);
  const completedRef = useRef(false);
  const restoreRun = useRunStore((s) => s.restoreRun);
  useEffect(() => {
    const current = useRunStore.getState().run;
    if (current) preEventRunRef.current = structuredClone(current);
    forceSaveRun();
    pauseRunPersistence();
    return () => {
      resumeRunPersistence();
      if (!completedRef.current && preEventRunRef.current) {
        restoreRun(preEventRunRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only commit the bag at explicit resolution points (finishChoice /
  // handleResultContinue / handleContinue). If the player quits to the main
  // menu or force-closes the tab mid-event, the bag stays untouched and the
  // same event is drawn on their next visit (same seed + same candidate list).
  const newBagRef = useRef(newBag);
  newBagRef.current = newBag;
  const commitBag = () => setEventBag(newBagRef.current);

  // Game type and shuffled rewards, stable per node.
  const { rewards: cardRewards } = useMemo(() => {
    const rand = createSeededRandom(`${run?.seed ?? ''}-cardgame-${run?.currentNodeId ?? ''}`);
    const roll = rand();
    const gameType: GameType = roll < 0.5 ? 'gold' : roll < 0.7 ? 'item' : 'health';
    if (!run) return { gameType, rewards: [] as Reward[] };
    const rewards = generateRewards(gameType, rand, run);
    return { gameType, rewards: seededShuffle(rewards, rand) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.seed, run?.currentNodeId]);

  // cardOrder[slot] = cardIdx currently in that visual slot.
  const [cardOrder, setCardOrder] = useState<number[]>([0, 1, 2]);
  const [phase, setPhase] = useState<Phase>('choose');
  const [pickedSlot, setPickedSlot] = useState<number | null>(null);
  const [resultText, setResultText] = useState<string>('');
  const [postResultScreen, setPostResultScreen] = useState<Screen>('map');
  // Abandoned Mine: current depth level (1-5). Only meaningful for that event.
  const [mineLevel, setMineLevel] = useState(1);

  // Preview -> settle -> shuffle
  useEffect(() => {
    if (phase !== 'preview') return;
    const t = setTimeout(() => setPhase('settle'), PREVIEW_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'settle') return;
    const t = setTimeout(() => setPhase('shuffle'), SETTLE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // Shuffle animation
  useEffect(() => {
    if (phase !== 'shuffle') return;
    const swap = setInterval(() => {
      setCardOrder((order) => {
        const i = Math.floor(Math.random() * 3);
        let j = Math.floor(Math.random() * 3);
        if (j === i) j = (j + 1) % 3;
        const next = [...order];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      });
    }, SHUFFLE_INTERVAL_MS);
    const stop = setTimeout(() => {
      clearInterval(swap);
      setPhase('pick');
    }, SHUFFLE_MS);
    return () => {
      clearInterval(swap);
      clearTimeout(stop);
    };
  }, [phase]);

  // reveal-picked -> reveal after 1s
  useEffect(() => {
    if (phase !== 'reveal-picked') return;
    const t = setTimeout(() => setPhase('reveal'), 1000);
    return () => clearTimeout(t);
  }, [phase]);

  if (!run) return null;

  const finishChoice = (choice: EventChoice, nextScreen: Screen = 'map') => {
    if (choice.resultText) {
      setResultText(choice.resultText);
      setPostResultScreen(nextScreen);
      setPhase('result');
    } else {
      completedRef.current = true;
      commitBag();
      setPendingEventResumeScreen(nextScreen === 'artifact' || nextScreen === 'combat' ? nextScreen : undefined);
      EventBus.emit(GameEvent.SCREEN_CHANGE, nextScreen);
    }
  };

  const pickRandomArtifact = (): ArtifactDefinition => pickArtifactForRun(run, Math.random);

  /**
   * Apply HP loss from an event. Returns true if the hit was lethal (run ended)
   * so callers can early-return before granting rewards or showing result text.
   */
  const applyHpLoss = (amount: number): boolean => {
    updateHealth(-amount);
    if ((useRunStore.getState().run?.health ?? 0) <= 0) {
      useRunStore.getState().setDeathCause(event.title);
      useRunStore.getState().endRun(false);
      EventBus.emit(GameEvent.SCREEN_CHANGE, 'score');
      return true;
    }
    return false;
  };

  const handleChoice = (choice: EventChoice) => {
    switch (choice.effect) {
      case 'play_card_game': {
        if (run.gold < PLAY_COST) return;
        updateGold(-PLAY_COST);
        setPhase('preview');
        return;
      }
      case 'well_climb': {
        if (applyHpLoss(18)) return;
        gainGold(142);
        const pool = CONSUMABLES.map((c) => c.id);
        addConsumable({ id: pool[Math.floor(Math.random() * pool.length)] });
        finishChoice(choice);
        return;
      }
      case 'well_bucket': {
        gainGold(45);
        finishChoice(choice);
        return;
      }
      case 'train_loot': {
        gainGold(20);
        const consumablePool = CONSUMABLES.map((c) => c.id);
        addConsumable({ id: consumablePool[Math.floor(Math.random() * consumablePool.length)] });
        const artifact = pickRandomArtifact();
        addArtifact({ id: artifact.id, tags: artifact.tags });
        finishChoice(choice);
        return;
      }
      case 'train_engine': {
        if (applyHpLoss(13)) return;
        // Queue a 3-artifact pick; Continue from the result screen routes to the artifact screen.
        useRunStore.getState().setPendingEventArtifactChoiceCount(3);
        finishChoice(choice, 'artifact');
        return;
      }
      case 'train_survivors': {
        useRunStore.getState().setNextMerchantDiscount(0.25);
        finishChoice(choice);
        return;
      }
      case 'abandoned_mine_step': {
        const config = MINE_LEVELS[mineLevel - 1];
        const base = config.hpBase === 'max' ? run.maxHealth : run.health;
        const hpLoss = Math.max(1, Math.floor(base * config.hpPct));
        if (applyHpLoss(hpLoss)) return;
        if (Math.random() < config.chance) {
          const artifact = pickRandomArtifact();
          addArtifact({ id: artifact.id, tags: artifact.tags });
          setResultText('Your hand closes on something strange in the dark. You carry it back to the light.');
          setPostResultScreen('map');
          setPhase('result');
        } else if (mineLevel < MINE_LEVELS.length) {
          // Miss: drop deeper and let the player choose again.
          setMineLevel(mineLevel + 1);
        }
        return;
      }
      case 'vulture_take': {
        const tiles = run.activeTileTypes.filter((tileType) => TILE_DEFINITIONS[tileType]?.upgradeText);
        if (tiles.length > 0) {
          const pick = tiles[Math.floor(Math.random() * tiles.length)];
          useRunStore.getState().upgradeTile(pick);
          playUpgrade();
        }
        const pool = CONSUMABLES.map((c) => c.id);
        for (let i = 0; i < 2; i++) {
          addConsumable({ id: pool[Math.floor(Math.random() * pool.length)] });
        }
        useRunStore.getState().setPendingActBossHpBonus(0.10);
        finishChoice(choice);
        return;
      }
      case 'vulture_bury': {
        const heal = adjustHeal(run, 11);
        syncHealth(Math.min(run.maxHealth, run.health + heal), run.maxHealth);
        gainGold(33);
        finishChoice(choice);
        return;
      }
      case 'preacher_confess': {
        if (run.gold < 100) return;
        updateGold(-100);
        const missing = run.maxHealth - run.health;
        const heal = adjustHeal(run, missing);
        syncHealth(run.health + heal, run.maxHealth);
        useRunStore.getState().setPendingNextFightGrace(3);
        finishChoice(choice);
        return;
      }
      case 'preacher_draw': {
        gainGold(146);
        const corrupt = pickArtifactByTag(run, 'corrupt', Math.random);
        if (corrupt) addArtifact({ id: corrupt.id, tags: corrupt.tags });
        const preacher = pickArtifactByTag(run, 'preacher', Math.random);
        if (preacher) addArtifact({ id: preacher.id, tags: preacher.tags });
        finishChoice(choice);
        return;
      }
      case 'campfire_sit': {
        const heal = adjustHeal(run, 20);
        syncHealth(Math.min(run.maxHealth, run.health + heal), run.maxHealth);
        finishChoice(choice);
        return;
      }
      case 'campfire_trade': {
        if (run.consumables.length === 0) return;
        const idx = Math.floor(Math.random() * run.consumables.length);
        useRunStore.getState().removeConsumable(idx);
        const pool = CONSUMABLES.map((c) => c.id);
        for (let i = 0; i < 2; i++) {
          addConsumable({ id: pool[Math.floor(Math.random() * pool.length)] });
        }
        finishChoice(choice);
        return;
      }
      case 'campfire_walk': {
        const current = run.pendingNextFightSwapBonus ?? 0;
        useRunStore.getState().setPendingNextFightSwapBonus(current + 2);
        finishChoice(choice);
        return;
      }
      case 'bridge_defuse': {
        // 50/50 split. On success, grant 2 TNT; on failure, take 21 HP.
        if (Math.random() < 0.5) {
          addConsumable({ id: 'stick_of_tnt' });
          addConsumable({ id: 'stick_of_tnt' });
          setResultText('The fuse goes still beneath your fingers. You pocket both bundles and step across the groaning planks.');
          setPostResultScreen('map');
          setPhase('result');
        } else {
          if (applyHpLoss(21)) return;
          setResultText('The fuse burns faster than your hands. You hit the rocks hard, dust in your teeth, but still breathing.');
          setPostResultScreen('map');
          setPhase('result');
        }
        return;
      }
      case 'bridge_blow': {
        if (applyHpLoss(6)) return;
        addConsumable({ id: 'lasso' });
        const current = run.pendingNextFightSwapBonus ?? 0;
        useRunStore.getState().setPendingNextFightSwapBonus(current + 1);
        finishChoice(choice);
        return;
      }
      case 'medicine_whiskey': {
        if (run.gold < 15) return;
        updateGold(-15);
        addConsumable({ id: 'strong_whiskey' });
        finishChoice(choice);
        return;
      }
      case 'medicine_panacea': {
        if (run.gold < 30) return;
        updateGold(-30);
        addConsumable({ id: 'panacea' });
        finishChoice(choice);
        return;
      }
      case 'medicine_threaten': {
        addConsumable({ id: 'snake_oil' });
        gainGold(129);
        useRunStore.getState().setActMerchantSurcharge(0.20);
        finishChoice(choice);
        return;
      }
      case 'snake_bite': {
        if (applyHpLoss(10)) return;
        const artifact = pickArtifactByTag(run, 'rattlesnake', Math.random);
        if (artifact) addArtifact({ id: artifact.id, tags: artifact.tags });
        finishChoice(choice);
        return;
      }
      case 'saloon_drink': {
        const heal = adjustHeal(run, 18);
        syncHealth(Math.min(run.maxHealth, run.health + heal), run.maxHealth);
        const current = run.pendingNextFightSwapBonus ?? 0;
        useRunStore.getState().setPendingNextFightSwapBonus(current - 1);
        finishChoice(choice);
        return;
      }
      case 'saloon_search': {
        if (Math.random() < 0.5) {
          const artifact = pickRandomArtifact();
          addArtifact({ id: artifact.id, tags: artifact.tags });
          setResultText('Dust sheets flutter as you pry open the back room cabinet. Something waits inside that has been yours since before you were born.');
          setPostResultScreen('map');
          setPhase('result');
        } else {
          useRunStore.getState().setForcedCombatEnemies(['bandit', 'bandit', 'bandit']);
          setResultText('Three shadows detach from the back wall with a clatter of holsters. The piano stops on a sour note.');
          setPostResultScreen('combat');
          setPhase('result');
        }
        return;
      }
      case 'saloon_move_on': {
        gainGold(39);
        finishChoice(choice);
        return;
      }
      case 'coyote_den_fight': {
        // Grant a random unowned artifact weighted by rarity.
        const artifact = pickRandomArtifact();
        addArtifact({ id: artifact.id, tags: artifact.tags });
        // Queue a 3-coyote encounter; Continue from the result screen transitions to combat.
        useRunStore.getState().setForcedCombatEnemies(['coyote', 'coyote', 'coyote']);
        finishChoice(choice, 'combat');
        return;
      }
      case 'none':
      default: {
        finishChoice(choice);
      }
    }
  };

  const handleResultContinue = () => {
    completedRef.current = true;
    commitBag();
    setPendingEventResumeScreen(
      postResultScreen === 'artifact' || postResultScreen === 'combat'
        ? postResultScreen
        : undefined,
    );
    EventBus.emit(GameEvent.SCREEN_CHANGE, postResultScreen);
  };

  const isChoiceDisabled = (choice: EventChoice): boolean => {
    if (choice.effect === 'play_card_game') return run.gold < PLAY_COST;
    if (choice.effect === 'preacher_confess') return run.gold < 100;
    if (choice.effect === 'campfire_trade') return run.consumables.length === 0;
    if (choice.effect === 'medicine_whiskey') return run.gold < 15;
    if (choice.effect === 'medicine_panacea') return run.gold < 30;
    return false;
  };

  const applyReward = (reward: Reward) => {
    switch (reward.kind) {
      case 'gold':
        if (reward.amount > 0) {
          gainGold(reward.amount);
        }
        return;
      case 'artifact':
        addArtifact({ id: reward.id, tags: reward.tags });
        return;
      case 'consumables':
        for (const id of reward.ids) addConsumable({ id });
        return;
      case 'lose_hp':
        applyHpLoss(reward.amount);
        return;
      case 'max_hp':
        if (run) {
          syncHealth(run.health, run.maxHealth + reward.amount);
        }
        return;
      case 'heal_full':
        if (run) {
          const missing = run.maxHealth - run.health;
          const heal = adjustHeal(run, missing);
          syncHealth(run.health + heal, run.maxHealth);
        }
        return;
    }
  };

  const handlePick = (slot: number) => {
    if (phase !== 'pick') return;
    const reward = cardRewards[cardOrder[slot]];
    if (reward) applyReward(reward);
    setPickedSlot(slot);
    setPhase('reveal-picked');
  };

  const renderCardFace = (reward: Reward | undefined) => {
    if (!reward) return null;
    switch (reward.kind) {
      case 'gold':
        return (
          <span className="relative flex items-center gap-1 text-yellow-800 font-bold" style={{ fontSize: 22 }}>
            <SpriteIcon frame={UI_FRAMES.gold} scale={1.5} />
            {reward.amount}
          </span>
        );
      case 'artifact': {
        const frame = ARTIFACT_FRAMES[reward.id];
        const def = ARTIFACTS.find((a) => a.id === reward.id);
        const rarity = def?.rarity ?? 'common';
        const c = RARITY_COLORS_DIM[rarity];
        return frame != null ? (
          <span
            className="relative"
            style={{
              display: 'inline-flex',
              filter: `drop-shadow(1px 0 0 ${c}) drop-shadow(-1px 0 0 ${c}) drop-shadow(0 1px 0 ${c}) drop-shadow(0 -1px 0 ${c})`,
            }}
          >
            <SpriteIcon frame={frame} scale={2.5} outline={c} />
          </span>
        ) : null;
      }
      case 'consumables':
        return (
          <div className="relative flex items-center gap-2">
            {reward.ids.map((id, i) => {
              const frame = id === 'tumbleweed' ? TILE_FRAMES.tumbleweed : CONSUMABLE_FRAMES[id];
              return frame != null ? <SpriteIcon key={i} frame={frame} scale={1.5} /> : null;
            })}
          </div>
        );
      case 'lose_hp':
        return (
          <span className="relative flex items-center gap-1 text-red-700 font-bold" style={{ fontSize: 20 }}>
            <SpriteIcon frame={UI_FRAMES.health} scale={1.5} />
            -{reward.amount}
          </span>
        );
      case 'max_hp':
        return (
          <span className="relative flex items-center gap-1 text-green-800 font-bold" style={{ fontSize: 14 }}>
            <SpriteIcon frame={UI_FRAMES.health} scale={1.5} />
            +{reward.amount} MAX
          </span>
        );
      case 'heal_full':
        return (
          <span className="relative flex items-center gap-1 text-green-800 font-bold" style={{ fontSize: 18 }}>
            <SpriteIcon frame={UI_FRAMES.health} scale={1.5} />
            FULL
          </span>
        );
    }
  };

  const handleContinue = () => {
    completedRef.current = true;
    commitBag();
    setPendingEventResumeScreen(undefined);
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'map' satisfies Screen);
  };

  const eventBg = `${import.meta.env.BASE_URL}assets/events/${event.background}`;

  // For each cardIdx, find its current slot.
  const slotOf = (cardIdx: number) => cardOrder.indexOf(cardIdx);

  // Face-up phases for each card
  const isFaceUp = (cardIdx: number) => {
    if (phase === 'preview') return true;
    if (phase === 'reveal-picked' && pickedSlot !== null && cardOrder[pickedSlot] === cardIdx) return true;
    if (phase === 'reveal') return true;
    return false;
  };

  const showPanel = phase === 'choose' || phase === 'result';

  return (
    <div
      className="relative flex flex-col h-full"
      style={{
        backgroundImage: `url(${eventBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="pt-10 px-4 flex flex-col items-center">
        <h2
          className="text-xl text-amber-400 text-center font-bold uppercase"
          style={{ WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}
        >
          {event.title}
        </h2>
      </div>

      {/* Cards overlay: centered on screen once Play is pressed */}
      {phase !== 'choose' && phase !== 'result' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none">
          <div
            className="relative pointer-events-auto"
            style={{ width: 2 * SLOT_OFFSETS_PX[2] + CARD_W, height: CARD_H }}
          >
            {[0, 1, 2].map((cardIdx) => {
              const slot = slotOf(cardIdx);
              const offset = SLOT_OFFSETS_PX[slot];
              const faceUp = isFaceUp(cardIdx);
              const reward = cardRewards[cardIdx];
              const dimmed = phase === 'reveal' && pickedSlot !== null && cardOrder[pickedSlot] !== cardIdx;
              return (
                <div
                  key={cardIdx}
                  className="absolute top-0 left-1/2"
                  style={{
                    transform: `translate(calc(-50% + ${offset}px), 0) scale(${dimmed ? 0.82 : 1})`,
                    transformOrigin: 'center',
                    transition: phase === 'reveal' ? 'transform 300ms ease, filter 300ms ease' : 'transform 60ms linear',
                    width: CARD_W,
                    height: CARD_H,
                    perspective: 900,
                    filter: dimmed ? 'brightness(0.65)' : 'none',
                  }}
                >
                  <div
                    onClick={() => handlePick(slot)}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      transformStyle: 'preserve-3d',
                      transform: faceUp ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      transition: 'transform 350ms ease',
                      cursor: phase === 'pick' ? 'pointer' : 'default',
                    }}
                    className={phase === 'pick' ? 'hover:scale-105' : ''}
                  >
                    {/* Card back */}
                    <img
                      src={`${import.meta.env.BASE_URL}assets/events/cardback.png`}
                      alt=""
                      draggable={false}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        backfaceVisibility: 'hidden',
                        borderRadius: 6,
                        boxShadow: '0 6px 12px rgba(0,0,0,0.6)',
                        imageRendering: 'pixelated',
                      }}
                    />
                    {/* Card front */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backfaceVisibility: 'hidden',
                        borderRadius: 6,
                        boxShadow: '0 6px 12px rgba(0,0,0,0.6)',
                        transform: 'rotateY(180deg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={`${import.meta.env.BASE_URL}assets/events/cardface.png`}
                        alt=""
                        draggable={false}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          borderRadius: 6,
                          imageRendering: 'pixelated',
                        }}
                      />
                      {renderCardFace(reward)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showPanel && (
        <div
          className="flex-1 flex flex-col justify-center"
          style={{
            alignItems: event.align === 'left' ? 'flex-start' : event.align === 'right' ? 'flex-end' : 'center',
            paddingLeft: event.align === 'left' ? 96 : 16,
            paddingRight: event.align === 'right' ? 96 : 16,
          }}
        >
          <div className="w-full" style={{ maxWidth: 340, marginTop: -40 }}>
            <div className="min-h-[56px] flex items-center" style={{ marginBottom: 20 }}>
              <p
                className="text-stone-300 font-bold leading-relaxed text-left"
                style={{
                  fontSize: 10,
                  WebkitTextStroke: '2px #000',
                  paintOrder: 'stroke fill',
                  whiteSpace: 'pre-line',
                }}
              >
                {phase === 'result' ? resultText : renderNarrativeText(event.flavourText)}
              </p>
            </div>

            {phase === 'choose' && (() => {
              // Abandoned Mine: choices change as the player descends.
              const choices = event.id === 'abandoned_mine'
                ? [
                    {
                      label: MINE_LEVELS[mineLevel - 1].label,
                      description: MINE_LEVELS[mineLevel - 1].description,
                      effect: 'abandoned_mine_step',
                    } satisfies EventChoice,
                    { label: 'Leave', description: '', effect: 'none' } satisfies EventChoice,
                  ]
                : event.choices;
              return (
              <div className="flex flex-col gap-2">
                {choices.map((choice, i) => {
                  const disabled = isChoiceDisabled(choice);
                  return (
                    <button
                      key={i}
                      onClick={() => handleChoice(choice)}
                      disabled={disabled}
                      style={{ fontSize: 10, boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
                      className={`p-2 rounded-sm text-left transition-transform active:translate-y-0.5 ${
                        disabled
                          ? 'bg-stone-900 opacity-50 cursor-not-allowed'
                          : 'bg-stone-800 hover:bg-stone-700'
                      }`}
                    >
                      <span
                        className="block text-amber-300 font-bold"
                        style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.6)' }}
                      >
                        {choice.label}
                      </span>
                      {choice.description && (
                        <span className="block text-stone-400">{choice.description}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              );
            })()}

            {phase === 'result' && (
              <button
                onClick={handleResultContinue}
                style={{ fontSize: 10, boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
                className="block mx-auto px-6 py-2 rounded-sm bg-amber-800 text-amber-200 hover:bg-amber-700 transition-transform active:translate-y-0.5"
              >
                Continue
              </button>
            )}

          </div>
        </div>
      )}

      {phase === 'reveal' && (
        <div
          className="pointer-events-none absolute inset-0 flex justify-center items-center"
          style={{ transform: `translateY(${CARD_H / 2 + 90}px)` }}
        >
          <button
            onClick={handleContinue}
            style={{ fontSize: 10, boxShadow: '3px 3px 2px rgba(0,0,0,0.7)' }}
            className="pointer-events-auto px-6 py-2 rounded-sm bg-amber-800 text-amber-200 hover:bg-amber-700 transition-transform active:translate-y-0.5"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
});
