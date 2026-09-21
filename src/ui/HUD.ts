import type { Player } from '../player/Player';

/**
 * HTML/CSS heads-up display. HUD only consumes data; it never touches physics.
 */
export class HUD {
  private readonly root: HTMLDivElement;
  private readonly speedValue: HTMLSpanElement;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.innerHTML = `
      <div class="hud-hint">W 加速 &nbsp;·&nbsp; A / D 转向 &nbsp;·&nbsp; S 刹车</div>
      <div class="hud-speed">
        <span class="hud-speed-value">0</span>
        <span class="hud-speed-unit">KM/H</span>
      </div>
    `;
    container.appendChild(this.root);

    this.speedValue = this.root.querySelector('.hud-speed-value') as HTMLSpanElement;
  }

  update(player: Player): void {
    this.speedValue.textContent = String(Math.round(player.getSpeedKmh()));
  }
}
