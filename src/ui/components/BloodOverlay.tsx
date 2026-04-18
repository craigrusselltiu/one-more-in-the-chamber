import { memo, useEffect, useRef, useState } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useRunStore } from '../../store/runStore';

/**
 * Fullscreen red flash when the player loses HP, whether from combat,
 * events, or any other source. Mounted above all other UI.
 */
const BLOOD_URL = `${import.meta.env.BASE_URL}assets/blood.png`;

export const BloodOverlay = memo(function BloodOverlay() {
  const [flashId, setFlashId] = useState(0);
  const combatHpRef = useRef<number | null>(null);
  const runHpRef = useRef<number | null>(null);
  const inCombatRef = useRef(false);

  useEffect(() => {
    const trigger = () => setFlashId((k) => k + 1);

    const onCombatHp = (...args: unknown[]) => {
      const current = args[0] as number;
      const prev = combatHpRef.current;
      combatHpRef.current = current;
      if (prev != null && current < prev) trigger();
    };

    const onCombatStart = () => {
      inCombatRef.current = true;
      combatHpRef.current = null;
    };
    const onCombatEnd = () => {
      inCombatRef.current = false;
      combatHpRef.current = null;
      // Swallow the runStore health sync that happens at combat end so it
      // doesn't re-trigger the flash for damage already shown mid-fight.
      runHpRef.current = useRunStore.getState().run?.health ?? null;
    };

    EventBus.on(GameEvent.PLAYER_HP_CHANGE, onCombatHp);
    EventBus.on(GameEvent.COMBAT_START, onCombatStart);
    EventBus.on(GameEvent.COMBAT_END, onCombatEnd);

    runHpRef.current = useRunStore.getState().run?.health ?? null;
    const unsub = useRunStore.subscribe((state) => {
      const run = state.run;
      if (!run) { runHpRef.current = null; return; }
      const prev = runHpRef.current;
      runHpRef.current = run.health;
      if (inCombatRef.current) return;
      if (prev != null && run.health < prev) trigger();
    });

    return () => {
      EventBus.off(GameEvent.PLAYER_HP_CHANGE, onCombatHp);
      EventBus.off(GameEvent.COMBAT_START, onCombatStart);
      EventBus.off(GameEvent.COMBAT_END, onCombatEnd);
      unsub();
    };
  }, []);

  if (flashId === 0) return null;

  return (
    <div
      key={flashId}
      className="blood-flash"
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${BLOOD_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: 'rgba(120, 0, 0, 0.25)',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
      aria-hidden
    />
  );
});
