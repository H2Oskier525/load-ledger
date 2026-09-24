import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

// Pick up new versions quickly: check for updates on open and every 30 min, reload when a new version takes over.
import { registerSW } from 'virtual:pwa-register';
const updateSW = registerSW({ immediate: true, onRegisteredSW(_u, r) { if (r) { setInterval(() => r.update(), 30 * 60 * 1000); document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && r.update()); } } });
void updateSW;
