import * as THREE from 'three';
import './styles/game.css';
import { Game } from './core/Game';
import { loadModelLibrary } from './world/ModelLibrary';
import { t } from './ui/I18n';

const container = document.getElementById('app');
if (!container) {
  throw new Error('SnowRush: #app container not found');
}

// Loading splash: progress bar driven by the shared Three loading manager.
const loading = document.getElementById('loading');
const fill = loading?.querySelector('.loading-bar-fill') as HTMLElement | null;
const percentEl = loading?.querySelector('.loading-percent') as HTMLElement | null;
const tipEl = loading?.querySelector('.loading-tip') as HTMLElement | null;

const TIPS = ['tip.1', 'tip.2', 'tip.3', 'tip.4'];
let tipIndex = 0;
const showTip = (): void => {
  if (tipEl) tipEl.textContent = t(TIPS[tipIndex % TIPS.length]);
};
showTip();
const tipTimer = window.setInterval(() => {
  tipIndex += 1;
  showTip();
}, 2600);

THREE.DefaultLoadingManager.onProgress = (_url, loaded, total) => {
  const ratio = total > 0 ? Math.min(loaded / total, 1) : 0;
  const pct = Math.round(ratio * 100);
  if (fill) fill.style.width = `${pct}%`;
  if (percentEl) percentEl.textContent = `${pct}%`;
};

const models = await loadModelLibrary();

window.clearInterval(tipTimer);
if (fill) fill.style.width = '100%';
if (percentEl) percentEl.textContent = '100%';
// Let the bar finish visibly before handing over to the game.
await new Promise((resolve) => setTimeout(resolve, 250));
loading?.remove();

const game = new Game(container, models);
game.init();
game.start();
