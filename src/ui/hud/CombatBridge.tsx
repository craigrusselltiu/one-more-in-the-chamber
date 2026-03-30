import { useCallback } from 'react';
import { GameEvent } from '../../game/EventBus';
import { useCombatStore } from '../../store/combatStore';
import { useEventBus } from '../hooks/useEventBus';
import type { CombatState } from '../../types/combat';

/**
 * CombatBridge: invisible component that listens to EventBus events
 * and syncs them into the Zustand combat store for React consumption.
 * Mounted once inside CombatHUD.
 */
export function CombatBridge() {
  const sync = useCombatStore((s) => s.syncFromCombatState);
  const setHealth = useCombatStore((s) => s.setPlayerHealth);
  const setGold = useCombatStore((s) => s.setGold);
  const setSwaps = useCombatStore((s) => s.setSwaps);
  const setAbility = useCombatStore((s) => s.setAbilityCharge);
  const setCombo = useCombatStore((s) => s.setCombo);

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
      setHealth(args[0] as number, args[1] as number);
    }, [setHealth]),
  );

  useEventBus(
    GameEvent.GOLD_CHANGE,
    useCallback((...args: unknown[]) => {
      setGold(args[0] as number);
    }, [setGold]),
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
