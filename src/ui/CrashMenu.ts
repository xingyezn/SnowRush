import { onLanguageChange, t } from './I18n';
import { playUiSound } from './UiSound';

export interface CrashHandlers {
  onRespawn: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

/** Shown after a crash: resume from the checkpoint, restart or quit to menu. */
export class CrashMenu {
  private readonly root: HTMLDivElement;
  private readonly titleEl: HTMLHeadingElement;
  private readonly respawnEl: HTMLButtonElement;
  private readonly restartEl: HTMLButtonElement;
  private readonly quitEl: HTMLButtonElement;
  private handlers: CrashHandlers | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'crash-menu';
    this.root.innerHTML = `
      <div class="menu-panel menu-panel--narrow">
        <h1 class="menu-title menu-title--small" data-crash="title"></h1>
        <button type="button" class="menu-button" data-action="respawn"></button>
        <button type="button" class="menu-button menu-button--ghost" data-action="restart"></button>
        <button type="button" class="menu-button menu-button--ghost" data-action="quit"></button>
      </div>
    `;
    container.appendChild(this.root);

    this.titleEl = this.root.querySelector('[data-crash="title"]') as HTMLHeadingElement;
    this.respawnEl = this.root.querySelector('[data-action="respawn"]') as HTMLButtonElement;
    this.restartEl = this.root.querySelector('[data-action="restart"]') as HTMLButtonElement;
    this.quitEl = this.root.querySelector('[data-action="quit"]') as HTMLButtonElement;

    this.respawnEl.addEventListener('click', () => {
      playUiSound('click');
      this.handlers?.onRespawn();
    });
    this.restartEl.addEventListener('click', () => {
      playUiSound('click');
      this.handlers?.onRestart();
    });
    this.quitEl.addEventListener('click', () => {
      playUiSound('back');
      this.handlers?.onQuit();
    });

    this.render();
    onLanguageChange(() => this.render());
  }

  private render(): void {
    this.titleEl.textContent = t('crash.title');
    this.respawnEl.textContent = t('crash.respawn');
    this.restartEl.textContent = t('pause.restart');
    this.quitEl.textContent = t('pause.quit');
  }

  show(handlers: CrashHandlers): void {
    this.handlers = handlers;
    this.root.classList.add('is-visible');
  }

  hide(): void {
    this.root.classList.remove('is-visible');
    this.handlers = null;
  }
}
