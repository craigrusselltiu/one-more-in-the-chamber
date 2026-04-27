import { memo, useRef, useState, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTutorialStore } from '../../store/tutorialStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useGameScale, UI_WIDTH, UI_HEIGHT } from '../hooks/useGameScale';
import { EventBus, GameEvent } from '../../game/EventBus';

const TOOLTIP_MAX_W = 300;
const MARGIN = 12;
const GAP = 12;

function clamp(pos: { left: number; top: number }, w: number, h: number) {
  return {
    left: Math.max(MARGIN, Math.min(UI_WIDTH - w - MARGIN, pos.left)),
    top: Math.max(MARGIN, Math.min(UI_HEIGHT - h - MARGIN, pos.top)),
  };
}

function computePosition(
  spotlight: { x: number; y: number; width: number; height: number } | undefined,
  tw: number,
  th: number,
  forced?: 'top' | 'bottom' | 'left' | 'right' | 'center',
): { left: number; top: number } {
  if (forced === 'center' || !spotlight) {
    return { left: (UI_WIDTH - tw) / 2, top: (UI_HEIGHT - th) / 2 };
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
    if (pos.left >= MARGIN && pos.left + tw <= UI_WIDTH - MARGIN
        && pos.top >= MARGIN && pos.top + th <= UI_HEIGHT - MARGIN) {
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
  const { scale, offsetX, offsetY } = useGameScale();

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipSize, setTooltipSize] = useState<{ w: number; h: number } | null>(null);

  // Dismiss on screen change (without marking complete)
  useEffect(() => {
    const handler = () => dismissTutorial();
    EventBus.on(GameEvent.SCREEN_CHANGE, handler);
    return () => { EventBus.off(GameEvent.SCREEN_CHANGE, handler); };
  }, [dismissTutorial]);

  // Measure tooltip size after render. The card is portal'd to body with an
  // explicit scale(scale) transform, so the bounding rect is in screen pixels
  // -- divide by the live scale to recover design-pixel dimensions for the
  // positioning math.
  useLayoutEffect(() => {
    if (!tooltipRef.current || !activeSequence) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    const s = scale > 0 ? scale : 1;
    setTooltipSize({ w: rect.width / s, h: rect.height / s });
  }, [activeSequence, stepIndex, scale]);

  if (!activeSequence) return null;

  const step = activeSequence.steps[stepIndex];
  if (!step) return null;

  const isLast = stepIndex >= activeSequence.steps.length - 1;

  // Resolve the spotlight rect in screen pixels. `viewportSpotlight` wins
  // over `spotlight` when both are set -- viewport-coord spotlights anchor
  // to the actual viewport corners (useful for things rendered outside the
  // 960x540 design space such as the seed input or version label).
  let spotlightRect: { left: number; top: number; width: number; height: number } | null = null;
  let virtualSpotlight: { x: number; y: number; width: number; height: number } | undefined = step.spotlight;

  if (step.viewportSpotlight) {
    const v = step.viewportSpotlight;
    const s = v.applyScale ? scale : 1;
    const w = v.width * s;
    const h = v.height * s;
    const left = v.hCenter
      ? window.innerWidth / 2 - w / 2 + (v.left ?? 0) * s
      : v.left !== undefined
      ? v.left * s
      : window.innerWidth - (v.right ?? 0) * s - w;
    const top = v.vCenter
      ? window.innerHeight / 2 - h / 2 + (v.top ?? 0) * s
      : v.top !== undefined
      ? v.top * s
      : window.innerHeight - (v.bottom ?? 0) * s - h;
    spotlightRect = { left, top, width: w, height: h };
    virtualSpotlight = {
      x: (left - offsetX) / scale,
      y: (top - offsetY) / scale,
      width: w / scale,
      height: h / scale,
    };
  } else if (step.spotlight) {
    spotlightRect = {
      left: offsetX + step.spotlight.x * scale,
      top: offsetY + step.spotlight.y * scale,
      width: step.spotlight.width * scale,
      height: step.spotlight.height * scale,
    };
  }

  const pos = tooltipSize
    ? computePosition(virtualSpotlight, tooltipSize.w, tooltipSize.h, step.tooltipPosition)
    : null;

  // The backdrop is rendered as a full-viewport click-blocker so swaps and
  // other interactions on the Phaser canvas underneath are absorbed. The
  // visible darkening uses a real div (no spotlight) or the boxShadow
  // cutout trick (with spotlight); either way the outer wrapper still
  // captures all pointer events.
  const backdrop = (
    <div
      className="fixed inset-0 z-[155]"
      style={{ pointerEvents: 'auto' }}
    >
      {spotlightRect ? (
        <div
          className="absolute"
          style={{
            left: spotlightRect.left,
            top: spotlightRect.top,
            width: spotlightRect.width,
            height: spotlightRect.height,
            borderRadius: 8 * scale,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.78)',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.78)', pointerEvents: 'none' }}
        />
      )}
    </div>
  );

  // The tooltip is portal'd to body too so it sits in the same stacking
  // context as the backdrop and can be layered above it. We apply the UI
  // scale to the card so the design-pixel content (font sizes, padding,
  // maxWidth) renders at the same visual scale as the rest of the UI.
  // The scale transform must always be applied (even on the hidden initial
  // render) so the measurement step sees the same scaled dimensions the
  // visible render will use. Without this, rect.width / scale gives the
  // wrong design width and the centered pos is offset.
  const tooltipCard = (
    <div
      className="fixed z-[160]"
      style={{
        pointerEvents: 'none',
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        ...(pos
          ? { left: offsetX + pos.left * scale, top: offsetY + pos.top * scale }
          : { left: 0, top: 0, visibility: 'hidden' as const }),
      }}
    >
      <div
        ref={tooltipRef}
        className="rounded-md px-4 py-3"
        style={{
          maxWidth: TOOLTIP_MAX_W,
          backgroundColor: 'rgba(28, 25, 23, 0.85)',
          boxShadow: '3px 3px 2px rgba(0,0,0,0.55)',
          pointerEvents: 'auto',
        }}
      >
          <p
            className="font-title text-sm text-amber-400 text-center font-bold uppercase mb-1.5"
            style={{ WebkitTextStroke: '2px #000', paintOrder: 'stroke fill', letterSpacing: '1px' }}
          >
            Tutorial
          </p>
          <p className="text-stone-200 mb-3" style={{ fontSize: '11px', lineHeight: '1.45' }}>
            {step.text}
          </p>
          <div className="flex justify-center gap-2">
            {step.showSkip && (
              <button
                onClick={() => {
                  useSettingsStore.getState().setTutorialsEnabled(false);
                  dismissTutorial();
                }}
                style={{ boxShadow: '2px 2px 1px rgba(0,0,0,0.4)', cursor: 'pointer' }}
                className="px-4 py-1.5 text-[11px] font-bold rounded-sm bg-stone-800 text-stone-300 hover:bg-stone-700 active:translate-y-0.5 transition-transform"
              >
                I'm good
              </button>
            )}
            <button
              onClick={advanceStep}
              style={{ boxShadow: '2px 2px 1px rgba(0,0,0,0.4)', cursor: 'pointer' }}
              className="px-4 py-1.5 text-[11px] font-bold rounded-sm bg-amber-800 text-amber-200 hover:bg-amber-700 active:translate-y-0.5 transition-transform"
            >
              {step.showSkip ? "LET'S GO!" : isLast ? 'Got it' : 'OK'}
            </button>
          </div>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(backdrop, document.body)}
      {createPortal(tooltipCard, document.body)}
    </>
  );
});
