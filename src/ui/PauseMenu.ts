import { onLanguageChange, t, toggleLanguage } from './I18n';

/** Pause overlay with resume / restart and a language toggle. */
export class PauseMenu {
  private readonly root: HTMLDivElement;
  private readonly titleEl: HTMLHeadingElement;
  private readonly resumeEl: HTMLButtonElement;
  private readonly restartEl: HTMLButtonElement;
  private readonly langEl: HTMLButtonElement;
  private onResume: (() => void) | null = null;
  private onRestart: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'pause-menu';
    this.root.innerHTML = `
      <div class="menu-panel">
        <h1 class="menu-title" data-pause="title"></h1>
        <button type="button" class="menu-button" data-action="resume"></button>
        <button type="button" class="menu-button menu-button--ghost" data-action="restart"></button>
        <button type="button" class="menu-lang" data-action="lang"></button>
      </div>
    `;
    container.appendChild(this.root);

    this.titleEl = this.root.querySelector('[data-pause="title"]') as HTMLHeadingElement;
    this.resumeEl = this.root.querySelector('[data-action="resume"]') as HTMLButtonElement;
    this.restartEl = this.root.querySelector('[data-action="restart"]') as HTMLButtonElement;
    this.langEl = this.root.querySelector('[data-action="lang"]') as HTMLButtonElement;

    this.resumeEl.addEventListener('click', () => this.onResume?.());
    this.restartEl.addEventListener('click', () => this.onRestart?.());
    this.langEl.addEventListener('click', () => toggleLanguage());

    this.render();
    onLanguageChange(() => this.render());
  }

  private render(): void {
    this.titleEl.textContent = t('pause.title');
    this.resumeEl.textContent = t('pause.resume');
    this.restartEl.textContent = t('pause.restart');
    this.langEl.textContent = t('menu.lang');
  }

  show(onResume: () => void, onRestart: () => void): void {
    this.onResume = onResume;
    this.onRestart = onRestart;
    this.root.classList.add('is-visible');
  }

  hide(): void {
    this.root.classList.remove('is-visible');
    this.onResume = null;
    this.onRestart = null;
  }
}
