import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initAuth } from './services/auth';
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
`;
document.head.appendChild(style);

// Global click SFX: any button click plays the click sound
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('button') && !target.closest('[data-no-click-sfx]')) {
    import('./services/sfx').then(({ playClick }) => playClick());
  }
}, true);

// Initialize Supabase auth listener (no-op when env vars are missing)
initAuth().catch(console.error);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
