import './styles/game.css';
import { Game } from './core/Game';
import { loadModelLibrary } from './world/ModelLibrary';

const container = document.getElementById('app');
if (!container) {
  throw new Error('SnowRush: #app container not found');
}

// Models are loaded before the game is built so the course can instance them.
const models = await loadModelLibrary();

document.getElementById('loading')?.remove();

const game = new Game(container, models);
game.init();
game.start();
