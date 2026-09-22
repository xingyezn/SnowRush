import type { CharacterOption } from '../world/ModelLibrary';
import { CONTROL_ROWS, onLanguageChange, t, toggleLanguage } from './I18n';
import { playUiSound } from './UiSound';
import { formatTime, getStats } from '../core/Stats';
import { ACHIEVEMENTS, isUnlocked } from '../core/Achievements';
import { isTouchDevice } from '../core/Platform';
import { getSettings, updateSettings, type GameMode } from '../core/Settings';
import { getDailyObjective, isDailyComplete } from '../core/Daily';

type MenuView = 'main' | 'characters' | 'modes' | 'howto' | 'records' | 'credits';

type RecordRow = [string, (value: ReturnType<typeof getStats>) => string];

const RECORD_ROWS: RecordRow[] = [
  ['records.runs', (s) => String(s.runs)],
  ['records.bestScore', (s) => s.bestScore.toLocaleString('en-US')],
  ['records.bestTime', (s) => (s.bestTimeMs > 0 ? formatTime(s.bestTimeMs) : '--:--')],
  ['records.bestSpeed', (s) => `${Math.round(s.bestSpeedKmh)} KM/H`],
  ['records.bestCombo', (s) => `×${s.bestCombo}`],
  ['records.tricks', (s) => String(s.tricks)],
  ['records.gates', (s) => String(s.gates)],
  ['records.crashes', (s) => String(s.crashes)],
  ['records.time', (s) => formatTime(s.totalTimeMs)],
];

/**
 * Title / start overlay with a small view stack (main / characters / how-to /
 * records / credits). Keyboard navigation (up-down + Enter + Esc, and left-right
 * on the character view) plus the live drag-to-rotate rider preview.
 */
export class StartMenu {
  private readonly root: HTMLDivElement;
  private readonly bestEl: HTMLParagraphElement;
  private readonly listEl: HTMLDivElement;
  private readonly recordsEl: HTMLDivElement;
  private readonly achievementsEl: HTMLDivElement;
  private readonly characterNameEl: HTMLDivElement;
  private readonly characterDescEl: HTMLDivElement;
  private readonly dailyEl: HTMLParagraphElement;
  private onStart: (() => void) | null = null;
  private onSelect: ((id: string) => void) | null = null;
  private onOpenSettings: (() => void) | null = null;
  private onPreviewDrag: ((dx: number) => void) | null = null;
  private bestScore = 0;
  private view: MenuView = 'main';
  private focusIndex = 0;
  private visible = false;
  private hoverTarget: HTMLElement | null = null;
  private characters: CharacterOption[] = [];
  private selectedCharacterId = '';

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'start-menu';
    this.root.innerHTML = `
      <div class="menu-preview-label" data-i18n="menu.preview"></div>
      <div class="touch-notice" data-i18n="touch.notice" hidden></div>
      <div class="menu-panel" role="dialog" aria-modal="true">
        <div class="menu-view" data-view="main">
          <h1 class="menu-title">SNOWRUSH</h1>
          <p class="menu-subtitle" data-i18n="menu.subtitle"></p>
          <p class="menu-best" data-menu="best"></p>
          <nav class="menu-list">
            <button type="button" class="menu-item" data-action="start" data-i18n="menu.start"></button>
            <button type="button" class="menu-item" data-action="characters" data-i18n="menu.characters"></button>
            <button type="button" class="menu-item" data-action="modes" data-i18n="menu.mode"></button>
            <button type="button" class="menu-item" data-action="howto" data-i18n="menu.howto"></button>
            <button type="button" class="menu-item" data-action="records" data-i18n="menu.records"></button>
            <button type="button" class="menu-item" data-action="settings" data-i18n="menu.settings"></button>
            <button type="button" class="menu-item" data-action="credits" data-i18n="menu.credits"></button>
          </nav>
          <p class="menu-daily" data-menu="daily"></p>
          <div class="menu-footer">
            <button type="button" class="menu-lang" data-action="lang" data-i18n="menu.lang"></button>
            <span class="menu-version">v1.0</span>
          </div>
        </div>

        <div class="menu-view" data-view="characters" hidden>
          <h2 class="menu-view-title" data-i18n="menu.characters"></h2>
          <div class="character-list"></div>
          <div class="character-name" data-menu="characterName"></div>
          <div class="character-desc" data-menu="characterDesc"></div>
          <button type="button" class="menu-button menu-button--ghost" data-action="back" data-i18n="menu.back"></button>
        </div>

        <div class="menu-view" data-view="modes" hidden>
          <h2 class="menu-view-title" data-i18n="menu.mode"></h2>
          <div class="mode-list">
            <button type="button" class="mode-option" data-mode="standard">
              <b data-i18n="mode.standard"></b><i data-i18n="mode.standard.desc"></i>
            </button>
            <button type="button" class="mode-option" data-mode="time">
              <b data-i18n="mode.time"></b><i data-i18n="mode.time.desc"></i>
            </button>
            <button type="button" class="mode-option" data-mode="oneline">
              <b data-i18n="mode.oneline"></b><i data-i18n="mode.oneline.desc"></i>
            </button>
          </div>
          <button type="button" class="menu-button menu-button--ghost" data-action="back" data-i18n="menu.back"></button>
        </div>

        <div class="menu-view" data-view="howto" hidden>
          <h2 class="menu-view-title" data-i18n="howto.title"></h2>
          <p class="menu-text" data-i18n="howto.goal"></p>
          <div class="menu-controls"></div>
          <button type="button" class="menu-button menu-button--ghost" data-action="back" data-i18n="menu.back"></button>
        </div>

        <div class="menu-view" data-view="records" hidden>
          <h2 class="menu-view-title" data-i18n="menu.records"></h2>
          <div class="records-grid" data-menu="records"></div>
          <h3 class="menu-section-title" data-i18n="menu.achievements"></h3>
          <div class="achievement-list" data-menu="achievements"></div>
          <button type="button" class="menu-button menu-button--ghost" data-action="back" data-i18n="menu.back"></button>
        </div>

        <div class="menu-view" data-view="credits" hidden>
          <h2 class="menu-view-title" data-i18n="credits.title"></h2>
          <div class="menu-credits">
            <div><span data-i18n="credits.dev"></span><b data-i18n="credits.devValue"></b></div>
            <div><span data-i18n="credits.models"></span><b data-i18n="credits.modelsValue"></b></div>
            <div><span data-i18n="credits.tech"></span><b data-i18n="credits.techValue"></b></div>
          </div>
          <button type="button" class="menu-button menu-button--ghost" data-action="back" data-i18n="menu.back"></button>
        </div>
      </div>
    `;
    container.appendChild(this.root);

    this.bestEl = this.root.querySelector('[data-menu="best"]') as HTMLParagraphElement;
    this.listEl = this.root.querySelector('.character-list') as HTMLDivElement;
    this.recordsEl = this.root.querySelector('[data-menu="records"]') as HTMLDivElement;
    this.achievementsEl = this.root.querySelector('[data-menu="achievements"]') as HTMLDivElement;
    this.characterNameEl = this.root.querySelector('[data-menu="characterName"]') as HTMLDivElement;
    this.characterDescEl = this.root.querySelector('[data-menu="characterDesc"]') as HTMLDivElement;
    this.dailyEl = this.root.querySelector('[data-menu="daily"]') as HTMLParagraphElement;
    const touchNotice = this.root.querySelector('.touch-notice') as HTMLElement;
    touchNotice.hidden = !isTouchDevice();

    this.root.addEventListener('click', (event) => {
      const mode = (event.target as HTMLElement).closest('[data-mode]')?.getAttribute('data-mode');
      if (mode === 'standard' || mode === 'time' || mode === 'oneline') {
        playUiSound('click');
        updateSettings({ mode: mode as GameMode });
        this.render();
        return;
      }
      const action = (event.target as HTMLElement)
        .closest('[data-action]')
        ?.getAttribute('data-action');
      if (action) this.handleAction(action);
    });

    this.listEl.addEventListener('click', (event) => {
      const id = (event.target as HTMLElement).closest('.character-chip')?.getAttribute('data-id');
      if (!id) return;
      this.selectCharacter(id);
    });

    this.root.addEventListener('pointerover', (event) => {
      const button = (event.target as HTMLElement).closest('button');
      if (!button) return;
      if (button !== this.hoverTarget) {
        this.hoverTarget = button;
        playUiSound('hover');
      }
      const items = this.focusable();
      const index = items.indexOf(button as HTMLButtonElement);
      if (index >= 0) this.setFocus(index);
    });

    window.addEventListener('keydown', this.handleKeyDown);

    let dragging = false;
    let lastX = 0;
    this.root.addEventListener('pointerdown', (event) => {
      if ((event.target as HTMLElement).closest('button')) return;
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

  setOnPreviewDrag(callback: (dx: number) => void): void {
    this.onPreviewDrag = callback;
  }

  setOnOpenSettings(callback: () => void): void {
    this.onOpenSettings = callback;
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
    this.characters = characters;
    this.visible = true;

    this.listEl.innerHTML = characters
      .map(
        (character) =>
          `<button type="button" class="character-chip" data-id="${character.id}">${character.name}</button>`,
      )
      .join('');
    const fallback = characters[0]?.id ?? '';
    this.selectCharacter(characters.some((c) => c.id === selectedId) ? selectedId : fallback, false);

    this.setView('main');
    this.render();
    this.root.classList.add('is-visible');
  }

  hide(): void {
    this.visible = false;
    this.root.classList.remove('is-visible');
    this.onStart = null;
    this.onSelect = null;
  }

  /** Opens a specific view (used for the first-run how-to). */
  openView(view: MenuView): void {
    this.setView(view);
  }

  private handleAction(action: string): void {
    playUiSound(action === 'back' ? 'back' : 'click');
    switch (action) {
      case 'start':
        this.onStart?.();
        break;
      case 'characters':
      case 'modes':
      case 'howto':
      case 'records':
      case 'credits':
        this.setView(action);
        break;
      case 'settings':
        this.onOpenSettings?.();
        break;
      case 'back':
        this.setView('main');
        break;
      case 'lang':
        toggleLanguage();
        break;
    }
  }

  private selectCharacter(id: string, notify = true): void {
    this.selectedCharacterId = id;
    for (const chip of this.listEl.querySelectorAll('.character-chip')) {
      chip.classList.toggle('is-selected', chip.getAttribute('data-id') === id);
    }
    this.renderCharacters();
    if (notify) {
      playUiSound('click');
      this.onSelect?.(id);
    }
  }

  private cycleCharacter(direction: number): void {
    if (this.characters.length === 0) return;
    const index = this.characters.findIndex((c) => c.id === this.selectedCharacterId);
    const next = (index + direction + this.characters.length) % this.characters.length;
    this.selectCharacter(this.characters[next].id);
  }

  private setView(view: MenuView): void {
    this.view = view;
    for (const el of this.root.querySelectorAll('.menu-view')) {
      (el as HTMLElement).hidden = el.getAttribute('data-view') !== view;
    }
    if (view === 'records') this.renderRecords();
    if (view === 'characters') this.renderCharacters();
    this.setFocus(0);
  }

  private focusable(): HTMLButtonElement[] {
    const active = this.root.querySelector(`.menu-view[data-view="${this.view}"]`);
    if (!active) return [];
    return Array.from(active.querySelectorAll('button'));
  }

  private setFocus(index: number): void {
    const items = this.focusable();
    if (items.length === 0) return;
    this.focusIndex = ((index % items.length) + items.length) % items.length;
    items.forEach((el, i) => el.classList.toggle('is-focused', i === this.focusIndex));
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.visible) return;
    if (this.view === 'characters' && (event.code === 'ArrowLeft' || event.code === 'ArrowRight')) {
      event.preventDefault();
      this.cycleCharacter(event.code === 'ArrowRight' ? 1 : -1);
      return;
    }
    switch (event.code) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        this.setFocus(this.focusIndex + (event.code === 'ArrowDown' ? 1 : -1));
        break;
      case 'Enter':
      case 'Space':
        event.preventDefault();
        this.focusable()[this.focusIndex]?.click();
        break;
      case 'Escape':
        if (this.view !== 'main') this.setView('main');
        break;
    }
  };

  private render(): void {
    for (const el of this.root.querySelectorAll('[data-i18n]')) {
      el.textContent = t(el.getAttribute('data-i18n') as string);
    }
    this.bestEl.textContent =
      this.bestScore > 0 ? `${t('menu.best')} ${this.bestScore.toLocaleString('en-US')}` : '';
    const controls = this.root.querySelector('.menu-controls');
    if (controls) {
      controls.innerHTML = CONTROL_ROWS.map(
        ([key, description]) => `<div><span>${t(key)}</span>${t(description)}</div>`,
      ).join('');
    }
    this.renderCharacters();
    if (this.view === 'records') this.renderRecords();

    const objective = getDailyObjective();
    const suffix = objective.kind === 'speed' ? ' km/h' : objective.kind === 'time' ? ' s' : '';
    this.dailyEl.textContent = `${t('daily.title')}：${t(`daily.kind.${objective.kind}`)} ${objective.target}${suffix}${
      isDailyComplete() ? ' ✓' : ''
    }`;
    for (const button of this.root.querySelectorAll('[data-mode]')) {
      button.classList.toggle('is-selected', button.getAttribute('data-mode') === getSettings().mode);
    }
  }

  private renderCharacters(): void {
    const character = this.characters.find((c) => c.id === this.selectedCharacterId);
    this.characterNameEl.textContent = character?.name ?? '';
    const descKey = character ? `character.${character.id}.desc` : '';
    this.characterDescEl.textContent = character ? t(descKey) : '';
  }

  private renderRecords(): void {
    const stats = getStats();
    this.recordsEl.innerHTML = RECORD_ROWS.map(
      ([key, value]) =>
        `<div class="records-row"><span>${t(key)}</span><b>${value(stats)}</b></div>`,
    ).join('');
    this.achievementsEl.innerHTML = ACHIEVEMENTS.map((def) => {
      const unlocked = isUnlocked(def.id);
      return `<div class="achievement${unlocked ? ' is-unlocked' : ''}">
        <span class="achievement-mark">${unlocked ? '★' : '☆'}</span>
        <span class="achievement-text"><b>${t(`ach.${def.id}.name`)}</b><i>${t(`ach.${def.id}.desc`)}</i></span>
      </div>`;
    }).join('');
  }
}
