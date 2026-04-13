import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initAuth } from './services/auth';
import { CONSUMABLE_FRAMES } from './data/spriteConfig';
import './styles.css';

// Set up custom cursors using BASE_URL so they work in both dev and production
const base = import.meta.env.BASE_URL;
const style = document.createElement('style');
style.textContent = `
  html, body {
    cursor: url('${base}assets/cursors/pointer.png'), auto;
    margin: 0;
    padding: 0;
    height: 100%;
    background-color: #1a1a2e !important;
    background-image: url('${base}assets/blur.png') !important;
    background-size: cover !important;
    background-position: center !important;
    background-repeat: no-repeat !important;
  }
  body.cursor-crosshair, body.cursor-crosshair * {
    cursor: url('${base}assets/cursors/crosshair.png') 64 64, crosshair !important;
  }
  body.cursor-lasso, body.cursor-lasso * {
    cursor: grab !important;
  }
`;
document.head.appendChild(style);

// Generate lasso cursor from sprite sheet (frame 685, 16x16 -> 32x32)
{
  const img = new Image();
  img.onload = () => {
    const FRAME = CONSUMABLE_FRAMES.lasso, SIZE = 16, COLS = 36, SCALE = 2;
    const c = document.createElement('canvas');
    c.width = c.height = SIZE * SCALE;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const sx = (FRAME % COLS) * SIZE, sy = Math.floor(FRAME / COLS) * SIZE;
    ctx.drawImage(img, sx, sy, SIZE, SIZE, 0, 0, SIZE * SCALE, SIZE * SCALE);
    const rule = document.createElement('style');
    rule.textContent = `body.cursor-lasso, body.cursor-lasso * { cursor: url('${c.toDataURL()}') 16 16, grab !important; }`;
    document.head.appendChild(rule);
  };
  img.src = `${base}assets/sprites/items_sheet.png`;
}

// Global click SFX: any button click plays the click sound
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('button') && !target.closest('[data-no-click-sfx]')) {
    import('./services/sfx').then(({ playClick }) => playClick());
  }
}, true);

// Recover from WebGL context loss (rare, but happens on some devices).
document.addEventListener('webglcontextlost', () => {
  window.location.reload();
}, true);

// Initialize Supabase auth listener (no-op when env vars are missing)
initAuth().catch(console.error);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
