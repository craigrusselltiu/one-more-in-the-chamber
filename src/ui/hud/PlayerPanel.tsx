import { memo, useMemo, useState, useEffect, useRef } from 'react';
import { useCombatStore, getPlayerStatusEffects } from '../../store/combatStore';
import { EventBus, GameEvent } from '../../game/EventBus';
import { HealthBar } from './HealthBar';
import { BlockBadge } from './BlockBadge';
import { StatusEffects } from './StatusEffects';
import { CharacterSheetSprite } from '../components/CharacterSheetSprite';

/**
 * PlayerPanel: left-side player area during combat.
 * Shows: sprite placeholder, HP bar, status effects.
 * Ability meter is rendered under the board in CombatHUD.
 */
const IDLE_FRAME_COUNT = 4;
const IDLE_FRAME_DELAY_MS = 180;
const CHARACTER_DISPLAY_SIZE = 96;

export const PlayerPanel = memo(function PlayerPanel() {
  const character = useCombatStore((s) => s.character);
  const health = useCombatStore((s) => s.playerHealth);
  const maxHealth = useCombatStore((s) => s.playerMaxHealth);
  const block = useCombatStore((s) => s.playerBlock);
  const store = useCombatStore();
  const effects = getPlayerStatusEffects(store);
  const nonBlockEffects = useMemo(() => effects.filter((e) => e.type !== 'block'), [effects]);

  const [attacking, setAttacking] = useState(false);
  const [hit, setHit] = useState(false);
  const [idleFrame, setIdleFrame] = useState(0);
  const attackTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hitTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if ((character !== 'red_panda' && character !== 'reno') || attacking) {
      setIdleFrame(0);
      return;
    }

    const interval = setInterval(() => {
      setIdleFrame((frame) => (frame + 1) % IDLE_FRAME_COUNT);
    }, IDLE_FRAME_DELAY_MS);

    return () => clearInterval(interval);
  }, [character, attacking]);

  useEffect(() => {
    const handler = () => {
      setAttacking(true);
      clearTimeout(attackTimerRef.current);
      attackTimerRef.current = setTimeout(() => setAttacking(false), 500);
    };
    EventBus.on(GameEvent.PLAYER_ATTACK, handler);
    return () => {
      EventBus.off(GameEvent.PLAYER_ATTACK, handler);
      clearTimeout(attackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      setHit(true);
      clearTimeout(hitTimerRef.current);
      hitTimerRef.current = setTimeout(() => setHit(false), 320);
    };
    EventBus.on(GameEvent.PLAYER_HIT, handler);
    return () => {
      EventBus.off(GameEvent.PLAYER_HIT, handler);
      clearTimeout(hitTimerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      {/* Character sprite with shadow */}
      <div className="relative mb-1" style={{ width: 96, height: 96 }}>
        <img
          src={`${import.meta.env.BASE_URL}assets/sprites/shadow.png`}
          alt=""
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          style={{ width: 80, imageRendering: 'pixelated', opacity: 0.5 }}
        />
        {character === 'red_panda' || character === 'reno' ? (
          <CharacterSheetSprite
            character={character}
            hit={hit}
            attacking={attacking}
            idleFrame={idleFrame}
            size={CHARACTER_DISPLAY_SIZE}
            playerSprite
          />
        ) : (
          <div style={{ width: CHARACTER_DISPLAY_SIZE, height: CHARACTER_DISPLAY_SIZE }} />
        )}
      </div>

      {/* HP bar centered, block badge overlaid to the left */}
      <div className="relative">
        <div className="absolute right-full mr-1.5 flex items-center" style={{ height: '100%', top: -1 }}>
          {block > 0 && <BlockBadge value={block} />}
        </div>
        <HealthBar current={health} max={maxHealth} width={120} />
      </div>

      {/* Status effects (excl block) - fixed height section */}
      <div style={{ minHeight: 24 }}>
        <StatusEffects effects={nonBlockEffects} />
      </div>

    </div>
  );
});
