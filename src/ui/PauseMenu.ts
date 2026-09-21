/** Pause overlay with resume / restart. */
export class PauseMenu {
  private readonly root: HTMLDivElement;
  private onResume: (() => void) | null = null;
  private onRestart: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'pause-menu';
    this.root.innerHTML = `
      <div class="menu-panel">
        <h1 class="menu-title">PAUSED</h1>
        <button type="button" class="menu-button" data-action="resume">RESUME</button>
        <button type="button" class="menu-button menu-button--ghost" data-action="restart">RESTART</button>
      </div>
    `;
    container.appendChild(this.root);

    (this.root.querySelector('[data-action="resume"]') as HTMLButtonElement).addEventListener(
      'click',
      () => this.onResume?.(),
    );
    (this.root.querySelector('[data-action="restart"]') as HTMLButtonElement).addEventListener(
      'click',
      () => this.onRestart?.(),
    );
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
