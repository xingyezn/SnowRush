import { CONFIG } from '../core/Config';
import type { Player } from '../player/Player';
import { onLanguageChange, t } from './I18n';

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
  private readonly scoreLabel: HTMLSpanElement;
  private readonly timeLabel: HTMLSpanElement;
  private readonly pauseButton: HTMLButtonElement;
  private hintTimer = 0;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.innerHTML = `
      <div class="hud-message"></div>
      <button type="button" class="hud-pause" aria-label="Pause"><span></span><span></span></button>
      <div class="hud-score">
        <span class="hud-label" data-label="score"></span>
        <span class="hud-score-value">0</span>
      </div>
      <div class="hud-time">
        <span class="hud-label" data-label="time"></span>
        <span class="hud-time-value">00:00</span>
      </div>
      <div class="hud-hint"></div>
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
    this.scoreLabel = this.root.querySelector('[data-label="score"]') as HTMLSpanElement;
    this.timeLabel = this.root.querySelector('[data-label="time"]') as HTMLSpanElement;
    this.pauseButton = this.root.querySelector('.hud-pause') as HTMLButtonElement;

    this.render();
    onLanguageChange(() => this.render());
  }

  private render(): void {
    this.scoreLabel.textContent = t('hud.score');
    this.timeLabel.textContent = t('hud.time');
    this.hintEl.textContent = t('hud.hint');
  }

  /** Hides the HUD on the menu so the character preview is unobstructed. */
  setVisible(visible: boolean): void {
    this.root.classList.toggle('is-hidden', !visible);
  }

  /** Registers the on-screen pause button handler. */
  onPause(callback: () => void): void {
    this.pauseButton.addEventListener('click', callback);
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
