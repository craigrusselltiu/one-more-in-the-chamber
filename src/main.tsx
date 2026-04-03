import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initAuth } from './services/auth';
import './styles.css';

// Set up custom cursors using BASE_URL so they work in both dev and production
const base = import.meta.env.BASE_URL;
const style = document.createElement('style');
style.textContent = `
  html, body { cursor: url('${base}assets/cursors/pointer.png'), auto; }
  body.cursor-crosshair, body.cursor-crosshair * {
    cursor: url('${base}assets/cursors/crosshair_2x.png') 31 31, crosshair !important;
  }
`;
document.head.appendChild(style);

// Initialize Supabase auth listener (no-op when env vars are missing)
initAuth().catch(console.error);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
