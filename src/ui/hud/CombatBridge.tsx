import { useCallback } from 'react';
import { GameEvent } from '../../game/EventBus';
import { useCombatStore } from '../../store/combatStore';
import { useRunStore } from '../../store/runStore';
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

  useEventBus(
    GameEvent.COMBAT_STATE_UPDATE,
    useCallback((...args: unknown[]) => {
      sync(args[0] as CombatState);
    }, [sync]),
  );

  useEventBus(
    GameEvent.TURN_START,
    useCallback((...args: unknown[]) => {
      sync(args[0] as CombatState);
    }, [sync]),
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
