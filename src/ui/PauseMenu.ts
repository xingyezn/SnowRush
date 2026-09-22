import { onLanguageChange, t, toggleLanguage } from './I18n';
import { playUiSound } from './UiSound';

export interface PauseHandlers {
  onResume: () => void;
  onRestart: () => void;
  onSettings: () => void;
  onQuit: () => void;
}

/** Pause overlay with resume / restart / settings / quit and a language toggle. */
export class PauseMenu {
  private readonly root: HTMLDivElement;
  private readonly titleEl: HTMLHeadingElement;
  private readonly resumeEl: HTMLButtonElement;
  private readonly restartEl: HTMLButtonElement;
  private readonly settingsEl: HTMLButtonElement;
  private readonly quitEl: HTMLButtonElement;
  private readonly langEl: HTMLButtonElement;
  private handlers: PauseHandlers | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'pause-menu';
    this.root.innerHTML = `
      <div class="menu-panel menu-panel--narrow">
        <h1 class="menu-title menu-title--small" data-pause="title"></h1>
        <button type="button" class="menu-button" data-action="resume"></button>
        <button type="button" class="menu-button menu-button--ghost" data-action="restart"></button>
        <button type="button" class="menu-button menu-button--ghost" data-action="settings"></button>
        <button type="button" class="menu-button menu-button--ghost" data-action="quit"></button>
        <button type="button" class="menu-lang" data-action="lang"></button>
      </div>
    `;
    container.appendChild(this.root);

    this.titleEl = this.root.querySelector('[data-pause="title"]') as HTMLHeadingElement;
    this.resumeEl = this.root.querySelector('[data-action="resume"]') as HTMLButtonElement;
    this.restartEl = this.root.querySelector('[data-action="restart"]') as HTMLButtonElement;
    this.settingsEl = this.root.querySelector('[data-action="settings"]') as HTMLButtonElement;
    this.quitEl = this.root.querySelector('[data-action="quit"]') as HTMLButtonElement;
    this.langEl = this.root.querySelector('[data-action="lang"]') as HTMLButtonElement;

    this.resumeEl.addEventListener('click', () => {
      playUiSound('click');
      this.handlers?.onResume();
    });
    this.restartEl.addEventListener('click', () => {
      playUiSound('click');
      this.handlers?.onRestart();
    });
    this.settingsEl.addEventListener('click', () => {
      playUiSound('click');
      this.handlers?.onSettings();
    });
    this.quitEl.addEventListener('click', () => {
      playUiSound('back');
      this.handlers?.onQuit();
    });
    this.langEl.addEventListener('click', () => {
      playUiSound('click');
      toggleLanguage();
    });

    this.render();
    onLanguageChange(() => this.render());
  }

  private render(): void {
    this.titleEl.textContent = t('pause.title');
    this.resumeEl.textContent = t('pause.resume');
    this.restartEl.textContent = t('pause.restart');
    this.settingsEl.textContent = t('pause.settings');
    this.quitEl.textContent = t('pause.quit');
    this.langEl.textContent = t('menu.lang');
  }

  show(handlers: PauseHandlers): void {
    this.handlers = handlers;
    this.root.classList.add('is-visible');
  }

  hide(): void {
    this.root.classList.remove('is-visible');
    this.handlers = null;
  }
}
