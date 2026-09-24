import { applySceneOverrides, type SceneOverrides } from './SceneOverrides';

/** Player-facing customisation, stored in this browser only (not the repo). */
const PLAYER_CONFIG_KEY = 'SnowRush.playerConfig';

/** Applies this browser's saved scene/character tuning (overrides the JSON). */
export function loadPlayerConfig(): void {
  try {
    const raw = window.localStorage.getItem(PLAYER_CONFIG_KEY);
    if (!raw) return;
    applySceneOverrides(JSON.parse(raw) as SceneOverrides);
  } catch {
    // ignore malformed storage
  }
}

/** Saves this browser's scene/character tuning. False if storage is unavailable. */
export function savePlayerConfig(data: SceneOverrides): boolean {
  try {
    window.localStorage.setItem(PLAYER_CONFIG_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearPlayerConfig(): void {
  try {
    window.localStorage.removeItem(PLAYER_CONFIG_KEY);
  } catch {
    // ignore
  }
}
