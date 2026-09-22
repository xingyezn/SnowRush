import { getLanguage, onLanguageChange, setLanguage, t } from './I18n';
import { getSettings, onSettingsChange, updateSettings } from '../core/Settings';
import { playUiSound } from './UiSound';
import { resetStats } from '../core/Stats';
import { resetAchievements } from '../core/Achievements';

/**
 * Settings overlay: language, master / music / sfx volume, mute and shadows.
 * Values live in the persisted Settings store; Game applies them.
 */
export class SettingsMenu {
  private readonly root: HTMLDivElement;
  private readonly volumeEl: HTMLInputElement;
  private readonly musicEl: HTMLInputElement;
  private readonly sfxEl: HTMLInputElement;
  private readonly muteEl: HTMLButtonElement;
  private readonly shadowsEl: HTMLButtonElement;
  private readonly tutorialEl: HTMLButtonElement;
  private readonly fpsEl: HTMLButtonElement;
  private onClose: (() => void) | null = null;
  private visible = false;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'settings-menu';
    this.root.innerHTML = `
      <div class="menu-panel menu-panel--narrow">
        <h2 class="menu-view-title" data-i18n="settings.title"></h2>
        <div class="settings-row">
          <span data-i18n="settings.language"></span>
          <div class="settings-lang">
            <button type="button" data-lang="zh">中文</button>
            <button type="button" data-lang="en">EN</button>
          </div>
        </div>
        <div class="settings-row">
          <span data-i18n="settings.volume"></span>
          <input type="range" min="0" max="100" step="5" data-setting="volume" />
        </div>
        <div class="settings-row">
          <span data-i18n="settings.music"></span>
          <input type="range" min="0" max="100" step="5" data-setting="music" />
        </div>
        <div class="settings-row">
          <span data-i18n="settings.sfx"></span>
          <input type="range" min="0" max="100" step="5" data-setting="sfx" />
        </div>
        <div class="settings-row">
          <span data-i18n="settings.mute"></span>
          <button type="button" class="settings-toggle" data-setting="mute"></button>
        </div>
        <div class="settings-row">
          <span data-i18n="settings.shadows"></span>
          <button type="button" class="settings-toggle" data-setting="shadows"></button>
        </div>
        <div class="settings-row">
          <span data-i18n="settings.tutorial"></span>
          <button type="button" class="settings-toggle" data-setting="tutorial"></button>
        </div>
        <div class="settings-row">
          <span data-i18n="settings.quality"></span>
          <div class="settings-choices">
            <button type="button" data-quality="auto"></button>
            <button type="button" data-quality="high"></button>
            <button type="button" data-quality="low"></button>
          </div>
        </div>
        <div class="settings-row">
          <span data-i18n="settings.view"></span>
          <div class="settings-choices">
            <button type="button" data-viewmode="third" data-i18n="view.third"></button>
            <button type="button" data-viewmode="first" data-i18n="view.first"></button>
          </div>
        </div>
        <div class="settings-row">
          <span data-i18n="settings.fps"></span>
          <button type="button" class="settings-toggle" data-setting="fps"></button>
        </div>
        <button type="button" class="settings-reset" data-action="reset" data-i18n="settings.reset"></button>
        <button type="button" class="menu-button menu-button--ghost" data-action="close" data-i18n="menu.back"></button>
      </div>
    `;
    container.appendChild(this.root);

    this.volumeEl = this.root.querySelector('[data-setting="volume"]') as HTMLInputElement;
    this.musicEl = this.root.querySelector('[data-setting="music"]') as HTMLInputElement;
    this.sfxEl = this.root.querySelector('[data-setting="sfx"]') as HTMLInputElement;
    this.muteEl = this.root.querySelector('[data-setting="mute"]') as HTMLButtonElement;
    this.shadowsEl = this.root.querySelector('[data-setting="shadows"]') as HTMLButtonElement;
    this.tutorialEl = this.root.querySelector('[data-setting="tutorial"]') as HTMLButtonElement;
    this.fpsEl = this.root.querySelector('[data-setting="fps"]') as HTMLButtonElement;

    this.volumeEl.addEventListener('input', () =>
      updateSettings({ volume: Number(this.volumeEl.value) / 100 }),
    );
    this.musicEl.addEventListener('input', () =>
      updateSettings({ musicVolume: Number(this.musicEl.value) / 100 }),
    );
    this.sfxEl.addEventListener('input', () =>
      updateSettings({ sfxVolume: Number(this.sfxEl.value) / 100 }),
    );
    this.muteEl.addEventListener('click', () => {
      playUiSound('click');
      updateSettings({ muted: !getSettings().muted });
    });
    this.shadowsEl.addEventListener('click', () => {
      playUiSound('click');
      updateSettings({ shadows: !getSettings().shadows });
    });
    this.tutorialEl.addEventListener('click', () => {
      playUiSound('click');
      updateSettings({ tutorial: !getSettings().tutorial });
    });
    this.fpsEl.addEventListener('click', () => {
      playUiSound('click');
      updateSettings({ showFps: !getSettings().showFps });
    });
    this.root.addEventListener('click', (event) => {
      const quality = (event.target as HTMLElement)
        .closest('[data-quality]')
        ?.getAttribute('data-quality');
      if (quality === 'auto' || quality === 'high' || quality === 'low') {
        playUiSound('click');
        updateSettings({ quality });
      }
      const view = (event.target as HTMLElement)
        .closest('[data-viewmode]')
        ?.getAttribute('data-viewmode');
      if (view === 'third' || view === 'first') {
        playUiSound('click');
        updateSettings({ view });
      }
    });
    this.root.addEventListener('click', (event) => {
      const lang = (event.target as HTMLElement).closest('[data-lang]')?.getAttribute('data-lang');
      if (lang === 'zh' || lang === 'en') {
        playUiSound('click');
        setLanguage(lang);
      }
      if ((event.target as HTMLElement).closest('[data-action="close"]')) {
        playUiSound('back');
        this.onClose?.();
      }
      if ((event.target as HTMLElement).closest('[data-action="reset"]')) {
        playUiSound('back');
        resetStats();
        resetAchievements();
      }
    });
    window.addEventListener('keydown', (event) => {
      if (this.visible && event.code === 'Escape') this.onClose?.();
    });

    onSettingsChange(() => this.sync());
    onLanguageChange(() => this.render());
    this.render();
  }

  show(onClose: () => void): void {
    this.onClose = onClose;
    this.visible = true;
    this.sync();
    this.render();
    this.root.classList.add('is-visible');
  }

  hide(): void {
    this.visible = false;
    this.root.classList.remove('is-visible');
    this.onClose = null;
  }

  private sync(): void {
    const settings = getSettings();
    this.volumeEl.value = String(Math.round(settings.volume * 100));
    this.musicEl.value = String(Math.round(settings.musicVolume * 100));
    this.sfxEl.value = String(Math.round(settings.sfxVolume * 100));
    this.muteEl.textContent = settings.muted ? t('settings.off') : t('settings.on');
    this.muteEl.classList.toggle('is-off', settings.muted);
    this.shadowsEl.textContent = settings.shadows ? t('settings.on') : t('settings.off');
    this.shadowsEl.classList.toggle('is-off', !settings.shadows);
    this.tutorialEl.textContent = settings.tutorial ? t('settings.on') : t('settings.off');
    this.tutorialEl.classList.toggle('is-off', !settings.tutorial);
    this.fpsEl.textContent = settings.showFps ? t('settings.on') : t('settings.off');
    this.fpsEl.classList.toggle('is-off', !settings.showFps);
    for (const button of this.root.querySelectorAll('[data-quality]')) {
      const quality = button.getAttribute('data-quality') as string;
      button.textContent = t(`quality.${quality}`);
      button.classList.toggle('is-selected', quality === settings.quality);
    }
    for (const button of this.root.querySelectorAll('[data-viewmode]')) {
      button.classList.toggle('is-selected', button.getAttribute('data-viewmode') === settings.view);
    }
    for (const button of this.root.querySelectorAll('[data-lang]')) {
      button.classList.toggle('is-selected', button.getAttribute('data-lang') === getLanguage());
    }
  }

  private render(): void {
    for (const el of this.root.querySelectorAll('[data-i18n]')) {
      el.textContent = t(el.getAttribute('data-i18n') as string);
    }
    this.sync();
  }
}
