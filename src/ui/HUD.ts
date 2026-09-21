import { CONFIG } from '../core/Config';
import type { Player } from '../player/Player';

/**
 * HTML/CSS heads-up display. HUD only consumes data; it never touches physics.
 */
export class HUD {
  private readonly root: HTMLDivElement;
  private readonly speedValue: HTMLSpanElement;
  private readonly scoreValue: HTMLSpanElement;
  private readonly timeValue: HTMLSpanElement;
  private readonly message: HTMLDivElement;
  private readonly hintEl: HTMLDivElement;
  private hintTimer = 0;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.innerHTML = `
      <div class="hud-message"></div>
      <div class="hud-score">
        <span class="hud-label">SCORE</span>
        <span class="hud-score-value">0</span>
      </div>
      <div class="hud-time">
        <span class="hud-label">TIME</span>
        <span class="hud-time-value">00:00</span>
      </div>
      <div class="hud-hint">W 加速 &nbsp;·&nbsp; A / D 转向 &nbsp;·&nbsp; S 刹车 &nbsp;·&nbsp; R 重置</div>
      <div class="hud-speed">
        <span class="hud-speed-value">0</span>
        <span class="hud-speed-unit">KM/H</span>
      </div>
    `;
    container.appendChild(this.root);

    this.speedValue = this.root.querySelector('.hud-speed-value') as HTMLSpanElement;
    this.scoreValue = this.root.querySelector('.hud-score-value') as HTMLSpanElement;
    this.timeValue = this.root.querySelector('.hud-time-value') as HTMLSpanElement;
    this.message = this.root.querySelector('.hud-message') as HTMLDivElement;
    this.hintEl = this.root.querySelector('.hud-hint') as HTMLDivElement;
  }

  /** Shows the controls hint and fades it out after a few seconds. */
  showHint(): void {
    this.hintEl.classList.remove('is-hidden');
    window.clearTimeout(this.hintTimer);
    this.hintTimer = window.setTimeout(
      () => this.hintEl.classList.add('is-hidden'),
      CONFIG.hud.hintDuration * 1000,
    );
  }

  update(player: Player): void {
    this.speedValue.textContent = String(Math.round(player.getSpeedKmh()));
  }

  setScore(score: number): void {
    this.scoreValue.textContent = score.toLocaleString('en-US');
  }

  setTime(text: string): void {
    this.timeValue.textContent = text;
  }

  setMessage(text: string): void {
    this.message.textContent = text;
    this.message.classList.add('is-visible');
  }

  clearMessage(): void {
    this.message.classList.remove('is-visible');
  }
}
