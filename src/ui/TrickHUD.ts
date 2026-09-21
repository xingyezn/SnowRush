import type { Trick } from '../systems/TrickSystem';

/**
 * Centre-screen trick popup: trick name, awarded points and combo multiplier.
 * Fades out on its own. HTML/CSS only.
 */
export class TrickHUD {
  private readonly root: HTMLDivElement;
  private readonly nameEl: HTMLDivElement;
  private readonly scoreEl: HTMLDivElement;
  private readonly comboEl: HTMLDivElement;
  private hideTimer = 0;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'trick-hud';
    this.root.innerHTML = `
      <div class="trick-name"></div>
      <div class="trick-score"></div>
      <div class="trick-combo"></div>
    `;
    container.appendChild(this.root);

    this.nameEl = this.root.querySelector('.trick-name') as HTMLDivElement;
    this.scoreEl = this.root.querySelector('.trick-score') as HTMLDivElement;
    this.comboEl = this.root.querySelector('.trick-combo') as HTMLDivElement;
  }

  show(tricks: Trick[], points: number, multiplier: number): void {
    if (tricks.length === 0) return;
    this.nameEl.textContent = tricks.map((t) => t.name).join(' + ');
    this.scoreEl.textContent = `+${points}`;
    this.comboEl.textContent = multiplier > 1 ? `COMBO ×${multiplier}` : '';

    this.root.classList.remove('is-visible');
    // Force a reflow so re-showing restarts the animation.
    void this.root.offsetWidth;
    this.root.classList.add('is-visible');

    window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => this.root.classList.remove('is-visible'), 1600);
  }

  clear(): void {
    window.clearTimeout(this.hideTimer);
    this.root.classList.remove('is-visible');
  }
}
