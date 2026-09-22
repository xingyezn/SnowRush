import { onLanguageChange, t } from './I18n';
import { playUiSound } from './UiSound';

/** Photo-mode overlay: a small control bar (save / exit) plus a saved flash. */
export class PhotoMode {
  private readonly root: HTMLDivElement;
  private readonly flashEl: HTMLDivElement;
  private onSave: (() => void) | null = null;
  private onExit: (() => void) | null = null;
  private flashTimer = 0;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'photo-mode';
    this.root.innerHTML = `
      <div class="photo-bar">
        <span class="photo-hint" data-i18n="photo.hint"></span>
        <button type="button" class="photo-btn" data-action="save" data-i18n="photo.save"></button>
        <button type="button" class="photo-btn" data-action="exit" data-i18n="photo.exit"></button>
      </div>
      <div class="photo-flash" data-i18n="photo.saved"></div>
    `;
    container.appendChild(this.root);

    this.flashEl = this.root.querySelector('.photo-flash') as HTMLDivElement;
    this.root.addEventListener('click', (event) => {
      const action = (event.target as HTMLElement)
        .closest('[data-action]')
        ?.getAttribute('data-action');
      if (action === 'save') {
        playUiSound('click');
        this.onSave?.();
      } else if (action === 'exit') {
        playUiSound('back');
        this.onExit?.();
      }
    });

    onLanguageChange(() => this.render());
    this.render();
  }

  show(onSave: () => void, onExit: () => void): void {
    this.onSave = onSave;
    this.onExit = onExit;
    this.root.classList.add('is-visible');
  }

  hide(): void {
    this.root.classList.remove('is-visible');
    this.onSave = null;
    this.onExit = null;
  }

  flashSaved(): void {
    this.flashEl.classList.add('is-visible');
    window.clearTimeout(this.flashTimer);
    this.flashTimer = window.setTimeout(() => this.flashEl.classList.remove('is-visible'), 1200);
  }

  private render(): void {
    for (const el of this.root.querySelectorAll('[data-i18n]')) {
      el.textContent = t(el.getAttribute('data-i18n') as string);
    }
  }
}
