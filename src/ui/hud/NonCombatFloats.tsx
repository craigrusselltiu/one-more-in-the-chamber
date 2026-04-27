import { memo, useEffect, useRef } from 'react';
import { useRunStore } from '../../store/runStore';
import { EventBus, GameEvent } from '../../game/EventBus';
import { playHeal, playHit } from '../../services/sfx';

/**
 * Subscribes to run store gold/health and emits topbar floating numbers
 * for non-combat screens. Combat handles its own floats via CombatManager events.
 */
export const NonCombatFloats = memo(function NonCombatFloats() {
  const goldRef = useRef<number | null>(null);
  const healthRef = useRef<number | null>(null);

  useEffect(() => {
    const initial = useRunStore.getState().run;
    goldRef.current = initial?.gold ?? null;
    healthRef.current = initial?.health ?? null;

    const unsub = useRunStore.subscribe((state) => {
      const run = state.run;
      if (!run) return;

      if (goldRef.current != null && run.gold !== goldRef.current) {
        const delta = run.gold - goldRef.current;
        const text = delta > 0 ? `+${delta}` : `${delta}`;
        const color = delta > 0 ? '#FFD700' : '#ff6666';
        EventBus.emit(GameEvent.FLOATING_NUMBER, 'topbar', 0, text, color, 13);
      }
      goldRef.current = run.gold;

      if (healthRef.current != null && run.health !== healthRef.current) {
        const delta = run.health - healthRef.current;
        const text = delta > 0 ? `+${delta}` : `${delta}`;
        const color = delta > 0 ? '#66ff66' : '#ff6666';
        EventBus.emit(GameEvent.FLOATING_NUMBER, 'topbar-health', 0, text, color, 13);
        if (delta > 0) playHeal();
        else if (delta < 0) playHit();
      }
      healthRef.current = run.health;
    });

    return unsub;
  }, []);

  return null;
});
