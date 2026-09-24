import { CONFIG } from './Config';

export type QualityLevel = 'auto' | 'high' | 'low';
export type GameMode = 'standard' | 'time' | 'oneline' | 'endless';
export type ViewMode = 'third' | 'first';
export type TrackMode = 'standard' | 'random';

export interface GameSettings {
  /** Master volume, 0..1. */
  volume: number;
  /** Background-music bus volume, 0..1. */
  musicVolume: number;
  /** Sound-effects bus volume, 0..1. */
  sfxVolume: number;
  muted: boolean;
  shadows: boolean;
  /** Show the first-run coach marks. */
  tutorial: boolean;
  /** Rendering quality; 'auto' adapts to the measured framerate. */
  quality: QualityLevel;
  showFps: boolean;
  /** Run rules: standard, time attack or one-life. */
  mode: GameMode;
  /** Camera: third-person chase or first-person. */
  view: ViewMode;
  /** Track: the fixed course or a fresh random one each run. */
  track: TrackMode;
}

const STORAGE_KEY = 'SnowRush.settings';

const DEFAULTS: GameSettings = {
  volume: CONFIG.audio.masterVolume,
  musicVolume: CONFIG.audio.musicVolume,
  sfxVolume: CONFIG.audio.sfxVolume,
  muted: false,
  shadows: true,
  tutorial: true,
  quality: 'auto',
  showFps: false,
  mode: 'standard',
  view: 'third',
  track: 'standard',
};

const clamp01 = (value: unknown, fallback: number): number =>
  typeof value === 'number' ? Math.min(Math.max(value, 0), 1) : fallback;

function load(): GameSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      volume: clamp01(parsed.volume, DEFAULTS.volume),
      musicVolume: clamp01(parsed.musicVolume, DEFAULTS.musicVolume),
      sfxVolume: clamp01(parsed.sfxVolume, DEFAULTS.sfxVolume),
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULTS.muted,
      shadows: typeof parsed.shadows === 'boolean' ? parsed.shadows : DEFAULTS.shadows,
      tutorial: typeof parsed.tutorial === 'boolean' ? parsed.tutorial : DEFAULTS.tutorial,
      quality:
        parsed.quality === 'high' || parsed.quality === 'low' || parsed.quality === 'auto'
          ? parsed.quality
          : DEFAULTS.quality,
      showFps: typeof parsed.showFps === 'boolean' ? parsed.showFps : DEFAULTS.showFps,
      mode:
        parsed.mode === 'time' ||
        parsed.mode === 'oneline' ||
        parsed.mode === 'endless' ||
        parsed.mode === 'standard'
          ? parsed.mode
          : DEFAULTS.mode,
      view: parsed.view === 'first' || parsed.view === 'third' ? parsed.view : DEFAULTS.view,
      track: parsed.track === 'random' || parsed.track === 'standard' ? parsed.track : DEFAULTS.track,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

let state: GameSettings = load();
const listeners = new Set<(settings: GameSettings) => void>();

export function getSettings(): GameSettings {
  return state;
}

export function updateSettings(patch: Partial<GameSettings>): void {
  state = { ...state, ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage can be unavailable (private mode); ignore.
  }
  for (const listener of listeners) listener(state);
}

export function onSettingsChange(listener: (settings: GameSettings) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
