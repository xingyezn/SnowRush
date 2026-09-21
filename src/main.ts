import './styles/game.css';
import { Game } from './core/Game';

const container = document.getElementById('app');
if (!container) {
  throw new Error('SnowRush: #app container not found');
}

const game = new Game(container);
game.init();
game.start();
