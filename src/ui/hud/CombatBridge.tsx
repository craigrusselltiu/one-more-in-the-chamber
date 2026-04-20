import { useCallback } from 'react';
import { GameEvent } from '../../game/EventBus';
import { useCombatStore } from '../../store/combatStore';
import { useRunStore } from '../../store/runStore';
import { useMetaStore } from '../../store/metaStore';
import { useEventBus } from '../hooks/useEventBus';
import type { CombatState } from '../../types/combat';

/**
 * CombatBridge: invisible component that listens to EventBus events
 * and syncs them into the Zustand combat store for React consumption.
 * Also keeps runStore in sync so the shared TopBar always reflects live values.
 * Mounted once inside CombatHUD.
 */
export function CombatBridge() {
  const sync = useCombatStore((s) => s.syncFromCombatState);
  const setHealth = useCombatStore((s) => s.setPlayerHealth);
  const setGold = useCombatStore((s) => s.setGold);
  const setSwaps = useCombatStore((s) => s.setSwaps);
  const setAbility = useCombatStore((s) => s.setAbilityCharge);
  const setCombo = useCombatStore((s) => s.setCombo);
  const syncRunHealth = useRunStore((s) => s.syncHealth);
  const syncRunGold = useRunStore((s) => s.syncGold);

  const discoverStatusEffects = useCallback((state: CombatState) => {
    const meta = useMetaStore.getState();

    const discoverIf = (slug: string, stacks: number | undefined) => {
      if ((stacks ?? 0) > 0) meta.discoverStatusEffect(slug);
    };

    // Player statuses (fields on CombatState)
    discoverIf('ace', state.aceStacks);
    discoverIf('lucky', state.luckyStacks);
    discoverIf('barricade', state.barricadeStacks);
    discoverIf('rageful', state.ragefulStacks);
    discoverIf('sturdy', state.sturdyStacks);
    discoverIf('grace', state.graceStacks);
    discoverIf('poison', state.poisonedStacks);
    discoverIf('ready', state.readyStacks);
    discoverIf('duel', state.duelStacks);
    discoverIf('chain', state.chainStacks);
    discoverIf('terrified', state.terrifiedStacks);
    discoverIf('vulnerable', state.vulnerableStacks);
    discoverIf('protected', state.protectedStacks);
    discoverIf('dead_man_walking', state.deadManWalkingStacks);
    discoverIf('loot', state.lootStacks);

    // Enemy statuses (fields on EnemyState)
    for (const e of state.enemies) {
      discoverIf('poison', e.poisonStacks);
      discoverIf('vulnerable', e.vulnerable);
      discoverIf('bounty', e.bountyStacks);
      discoverIf('terrified', e.terrifiedStacks);
      discoverIf('blinded', e.blindedStacks);
      discoverIf('rageful', e.ragefulStacks);
      discoverIf('grace', e.graceStacks);
      discoverIf('dead_man_walking', e.deadManWalking);
      discoverIf('barricade', e.barricadeStacks);
      discoverIf('invulnerable', e.invulnerable);
      discoverIf('scavenger', e.scavenger);
    }
  }, []);

  useEventBus(
    GameEvent.COMBAT_STATE_UPDATE,
    useCallback((...args: unknown[]) => {
      const state = args[0] as CombatState;
      sync(state);
      discoverStatusEffects(state);
    }, [sync, discoverStatusEffects]),
  );

  useEventBus(
    GameEvent.TURN_START,
    useCallback((...args: unknown[]) => {
      const state = args[0] as CombatState;
      sync(state);
      discoverStatusEffects(state);
    }, [sync, discoverStatusEffects]),
  );

  useEventBus(
    GameEvent.PLAYER_HP_CHANGE,
    useCallback((...args: unknown[]) => {
      const current = args[0] as number;
      const max = args[1] as number;
      setHealth(current, max);
      syncRunHealth(current, max);
    }, [setHealth, syncRunHealth]),
  );

  useEventBus(
    GameEvent.GOLD_CHANGE,
    useCallback((...args: unknown[]) => {
      const amount = args[0] as number;
      setGold(amount);
      syncRunGold(amount);
    }, [setGold, syncRunGold]),
  );

  useEventBus(
    GameEvent.SWAPS_CHANGE,
    useCallback((...args: unknown[]) => {
      setSwaps(args[0] as number, args[1] as number);
    }, [setSwaps]),
  );

  useEventBus(
    GameEvent.ABILITY_CHARGE_CHANGE,
    useCallback((...args: unknown[]) => {
      setAbility(args[0] as number, args[1] as number);
    }, [setAbility]),
  );

  useEventBus(
    GameEvent.COMBO_UPDATE,
    useCallback((...args: unknown[]) => {
      setCombo(args[0] as number);
    }, [setCombo]),
  );

  return null;
}
