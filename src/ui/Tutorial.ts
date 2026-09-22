import { onLanguageChange, t } from './I18n';

/**
 * Lightweight first-run coach marks. Game decides the steps and when they are
 * satisfied; this only renders the current hint and a skip button.
 */
export class Tutorial {
  private readonly root: HTMLDivElement;
  private readonly textEl: HTMLDivElement;
  private readonly skipEl: HTMLButtonElement;
  private onSkip: (() => void) | null = null;
  private textKey = '';
  private active = false;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'tutorial';
    this.root.innerHTML = `
      <div class="tutorial-panel">
        <div class="tutorial-text"></div>
        <button type="button" class="tutorial-skip" data-action="skip"></button>
      </div>
    `;
    container.appendChild(this.root);

    this.textEl = this.root.querySelector('.tutorial-text') as HTMLDivElement;
    this.skipEl = this.root.querySelector('.tutorial-skip') as HTMLButtonElement;
    this.skipEl.addEventListener('click', () => this.onSkip?.());

    this.renderLabels();
    onLanguageChange(() => this.renderLabels());
  }

  get isActive(): boolean {
    return this.active;
  }

  setOnSkip(callback: () => void): void {
    this.onSkip = callback;
  }

  start(textKey: string): void {
    this.active = true;
    this.textKey = textKey;
    this.renderLabels();
    this.root.classList.add('is-visible');
  }

  setText(textKey: string): void {
    this.textKey = textKey;
    this.textEl.textContent = t(textKey);
  }

  stop(): void {
    this.active = false;
    this.root.classList.remove('is-visible');
  }

  private renderLabels(): void {
    this.skipEl.textContent = t('tutorial.skip');
    if (this.textKey) this.textEl.textContent = t(this.textKey);
  }
}
