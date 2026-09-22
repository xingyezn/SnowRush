import type { CharacterOption } from '../world/ModelLibrary';
import { CONTROL_ROWS, onLanguageChange, t, toggleLanguage } from './I18n';

/** Title / start overlay. Hosts the rider picker and language toggle. */
export class StartMenu {
  private readonly root: HTMLDivElement;
  private readonly subtitleEl: HTMLParagraphElement;
  private readonly bestEl: HTMLParagraphElement;
  private readonly riderTitleEl: HTMLParagraphElement;
  private readonly listEl: HTMLDivElement;
  private readonly playEl: HTMLButtonElement;
  private readonly controlsEl: HTMLDivElement;
  private readonly langEl: HTMLButtonElement;
  private onStart: (() => void) | null = null;
  private onSelect: ((id: string) => void) | null = null;
  private onPreviewDrag: ((dx: number) => void) | null = null;
  private bestScore = 0;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'start-menu';
    this.root.innerHTML = `
      <div class="menu-preview-label" data-menu="preview"></div>
      <div class="menu-panel">
        <h1 class="menu-title">SNOWRUSH</h1>
        <p class="menu-subtitle" data-menu="subtitle"></p>
        <p class="menu-best" data-menu="best"></p>
        <div class="menu-characters">
          <p class="menu-characters-title" data-menu="rider"></p>
          <div class="character-list"></div>
        </div>
        <button type="button" class="menu-button" data-action="play"></button>
        <div class="menu-controls"></div>
        <button type="button" class="menu-lang" data-action="lang"></button>
      </div>
    `;
    container.appendChild(this.root);

    this.subtitleEl = this.root.querySelector('[data-menu="subtitle"]') as HTMLParagraphElement;
    this.bestEl = this.root.querySelector('[data-menu="best"]') as HTMLParagraphElement;
    this.riderTitleEl = this.root.querySelector('[data-menu="rider"]') as HTMLParagraphElement;
    this.listEl = this.root.querySelector('.character-list') as HTMLDivElement;
    this.playEl = this.root.querySelector('[data-action="play"]') as HTMLButtonElement;
    this.controlsEl = this.root.querySelector('.menu-controls') as HTMLDivElement;
    this.langEl = this.root.querySelector('[data-action="lang"]') as HTMLButtonElement;

    this.playEl.addEventListener('click', () => this.onStart?.());
    this.langEl.addEventListener('click', () => toggleLanguage());
    this.listEl.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const id = target.closest('.character-chip')?.getAttribute('data-id');
      if (!id) return;
      this.setSelected(id);
      this.onSelect?.(id);
    });

    // Drag anywhere on the overlay (except buttons) to rotate the preview.
    let dragging = false;
    let lastX = 0;
    this.root.addEventListener('pointerdown', (event) => {
      if ((event.target as HTMLElement).closest('button')) return;
      // Stop the drag from selecting the panel / control text.
      event.preventDefault();
      dragging = true;
      lastX = event.clientX;
    });
    window.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      this.onPreviewDrag?.(event.clientX - lastX);
      lastX = event.clientX;
    });
    window.addEventListener('pointerup', () => {
      dragging = false;
    });
    window.addEventListener('pointercancel', () => {
      dragging = false;
    });

    this.render();
    onLanguageChange(() => this.render());
  }

  /** Lets Game rotate the preview when the player drags on the menu. */
  setOnPreviewDrag(callback: (dx: number) => void): void {
    this.onPreviewDrag = callback;
  }

  private render(): void {
    this.subtitleEl.textContent = t('menu.subtitle');
    this.riderTitleEl.textContent = t('menu.rider');
    this.playEl.textContent = t('menu.play');
    this.langEl.textContent = t('menu.lang');
    this.bestEl.textContent =
      this.bestScore > 0 ? `${t('menu.best')} ${this.bestScore.toLocaleString('en-US')}` : '';
    this.controlsEl.innerHTML = CONTROL_ROWS.map(
      ([key, description]) => `<div><span>${t(key)}</span>${t(description)}</div>`,
    ).join('');
    const preview = this.root.querySelector('[data-menu="preview"]');
    if (preview) preview.textContent = t('menu.preview');
  }

  private setSelected(id: string): void {
    for (const chip of this.listEl.querySelectorAll('.character-chip')) {
      chip.classList.toggle('is-selected', chip.getAttribute('data-id') === id);
    }
  }

  show(
    bestScore: number,
    characters: CharacterOption[],
    selectedId: string,
    onStart: () => void,
    onSelect: (id: string) => void,
  ): void {
    this.onStart = onStart;
    this.onSelect = onSelect;
    this.bestScore = bestScore;

    this.listEl.innerHTML = characters
      .map(
        (character) =>
          `<button type="button" class="character-chip" data-id="${character.id}">${character.name}</button>`,
      )
      .join('');
    const fallback = characters[0]?.id ?? '';
    this.setSelected(characters.some((c) => c.id === selectedId) ? selectedId : fallback);

    this.render();
    this.root.classList.add('is-visible');
  }

  hide(): void {
    this.root.classList.remove('is-visible');
    this.onStart = null;
    this.onSelect = null;
  }
}
