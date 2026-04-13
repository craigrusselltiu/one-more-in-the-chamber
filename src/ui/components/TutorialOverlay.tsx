import { memo, useRef, useState, useLayoutEffect, useEffect } from 'react';
import { useTutorialStore } from '../../store/tutorialStore';
import { useSettingsStore } from '../../store/settingsStore';
import { EventBus, GameEvent } from '../../game/EventBus';

const SCREEN_W = 960;
const SCREEN_H = 540;
const TOOLTIP_MAX_W = 280;
const MARGIN = 12;
const GAP = 10;

function clamp(pos: { left: number; top: number }, w: number, h: number) {
  return {
    left: Math.max(MARGIN, Math.min(SCREEN_W - w - MARGIN, pos.left)),
    top: Math.max(MARGIN, Math.min(SCREEN_H - h - MARGIN, pos.top)),
  };
}

function computePosition(
  spotlight: { x: number; y: number; width: number; height: number } | undefined,
  tw: number,
  th: number,
  forced?: 'top' | 'bottom' | 'left' | 'right',
): { left: number; top: number } {
  if (!spotlight) {
    return { left: (SCREEN_W - tw) / 2, top: (SCREEN_H - th) / 2 };
  }

  const cx = spotlight.x + spotlight.width / 2;
  const cy = spotlight.y + spotlight.height / 2;

  const positions = {
    bottom: { left: cx - tw / 2, top: spotlight.y + spotlight.height + GAP },
    right:  { left: spotlight.x + spotlight.width + GAP, top: cy - th / 2 },
    left:   { left: spotlight.x - tw - GAP, top: cy - th / 2 },
    top:    { left: cx - tw / 2, top: spotlight.y - th - GAP },
  };

  if (forced) return clamp(positions[forced], tw, th);

  for (const dir of ['bottom', 'right', 'left', 'top'] as const) {
    const pos = positions[dir];
    if (pos.left >= MARGIN && pos.left + tw <= SCREEN_W - MARGIN
        && pos.top >= MARGIN && pos.top + th <= SCREEN_H - MARGIN) {
      return pos;
    }
  }

  return clamp(positions.bottom, tw, th);
}

export const TutorialOverlay = memo(function TutorialOverlay() {
  const activeSequence = useTutorialStore((s) => s.activeSequence);
  const stepIndex = useTutorialStore((s) => s.stepIndex);
  const advanceStep = useTutorialStore((s) => s.advanceStep);
  const dismissTutorial = useTutorialStore((s) => s.dismissTutorial);

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipSize, setTooltipSize] = useState<{ w: number; h: number } | null>(null);

  // Dismiss on screen change (without marking complete)
  useEffect(() => {
    const handler = () => dismissTutorial();
    EventBus.on(GameEvent.SCREEN_CHANGE, handler);
    return () => { EventBus.off(GameEvent.SCREEN_CHANGE, handler); };
  }, [dismissTutorial]);

  // Measure tooltip size after render
  useLayoutEffect(() => {
    if (!tooltipRef.current || !activeSequence) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    // Convert from screen pixels back to virtual space
    const container = tooltipRef.current.closest('.overflow-hidden') as HTMLElement | null;
    const scale = container ? container.getBoundingClientRect().width / SCREEN_W : 1;
    setTooltipSize({ w: rect.width / scale, h: rect.height / scale });
  }, [activeSequence, stepIndex]);

  if (!activeSequence) return null;

  const step = activeSequence.steps[stepIndex];
  if (!step) return null;

  const isLast = stepIndex >= activeSequence.steps.length - 1;
  const pos = tooltipSize
    ? computePosition(step.spotlight, tooltipSize.w, tooltipSize.h, step.tooltipPosition)
    : null;

  return (
    <div className="absolute inset-0 z-[160]" style={{ pointerEvents: 'auto' }}>
      {/* Dark overlay with optional spotlight cutout */}
      {step.spotlight ? (
        <div
          className="absolute"
          style={{
            left: step.spotlight.x,
            top: step.spotlight.y,
            width: step.spotlight.width,
            height: step.spotlight.height,
            borderRadius: 8,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.75)',
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.75)' }} />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute bg-stone-900/95 border border-stone-600 px-3 py-2.5"
        style={{
          maxWidth: TOOLTIP_MAX_W,
          ...(pos
            ? { left: pos.left, top: pos.top }
            : { left: SCREEN_W / 2, top: SCREEN_H / 2, visibility: 'hidden' as const }),
        }}
      >
        <p className="text-amber-400 mb-1 tracking-wide text-center text-sm">TUTORIAL</p>
        <p className="text-stone-200 mb-2" style={{ fontSize: '11px', lineHeight: '1.4' }}>
          {step.text}
        </p>
        <div className="flex justify-center gap-2">
          {step.showSkip && (
            <button
              onClick={() => {
                useSettingsStore.getState().setTutorialsEnabled(false);
                dismissTutorial();
              }}
              className="px-4 py-1 text-xs text-stone-500 border border-stone-700 hover:text-stone-300 hover:border-stone-500"
              style={{ cursor: 'pointer' }}
            >
              I'm good
            </button>
          )}
          <button
            onClick={advanceStep}
            className="px-4 py-1 text-xs bg-amber-900/60 text-amber-300 border border-amber-700 hover:bg-amber-800/60"
            style={{ cursor: 'pointer' }}
          >
            {step.showSkip ? "LET'S GO!" : isLast ? 'Got it' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
});
