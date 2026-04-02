import { useState, useEffect } from 'react';
import { GAME_WIDTH, GAME_HEIGHT } from '../../game/GameConfig';

/**
 * Virtual resolution for the React UI overlay.
 * Exactly 2x Phaser's internal resolution (480x270).
 * This gives finer layout control while scaling to the same screen area.
 */
export const UI_WIDTH = GAME_WIDTH * 2;  // 960
export const UI_HEIGHT = GAME_HEIGHT * 2; // 540

/**
 * Returns the scale factor and offset so the React overlay covers
 * the same screen area as Phaser's FIT + CENTER_BOTH canvas.
 */
export function useGameScale() {
  const [layout, setLayout] = useState(() => computeLayout());

  useEffect(() => {
    const onResize = () => setLayout(computeLayout());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    // Use VisualViewport API for more reliable mobile dimensions
    // (accounts for on-screen keyboard, pinch zoom, etc.)
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', onResize);
      vv.addEventListener('scroll', onResize);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (vv) {
        vv.removeEventListener('resize', onResize);
        vv.removeEventListener('scroll', onResize);
      }
    };
  }, []);

  return layout;
}

function computeLayout() {
  // Prefer visualViewport dimensions on mobile for accuracy
  const vv = window.visualViewport;
  const vw = vv ? vv.width : window.innerWidth;
  const vh = vv ? vv.height : window.innerHeight;
  // Scale so UI_WIDTH x UI_HEIGHT fills the same area as Phaser's canvas
  const scale = Math.min(vw / UI_WIDTH, vh / UI_HEIGHT);
  const offsetX = (vw - UI_WIDTH * scale) / 2;
  const offsetY = (vh - UI_HEIGHT * scale) / 2;
  return { scale, offsetX, offsetY };
}
