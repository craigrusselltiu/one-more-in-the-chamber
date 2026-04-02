import { useState, useEffect } from 'react';

/**
 * Virtual resolution for the React UI overlay.
 * Fixed at 960x540 regardless of Phaser's internal resolution.
 */
export const UI_WIDTH = 960;
export const UI_HEIGHT = 540;

/**
 * Returns the scale factor and offset so the React overlay covers
 * the same screen area as Phaser's FIT + CENTER_BOTH canvas.
 */
export function useGameScale() {
  const [layout, setLayout] = useState(() => computeLayout());

  useEffect(() => {
    const onResize = () => setLayout(computeLayout());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return layout;
}

function computeLayout() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Scale so UI_WIDTH x UI_HEIGHT fills the same area as Phaser's canvas
  const scale = Math.min(vw / UI_WIDTH, vh / UI_HEIGHT);
  const offsetX = (vw - UI_WIDTH * scale) / 2;
  const offsetY = (vh - UI_HEIGHT * scale) / 2;
  return { scale, offsetX, offsetY };
}
