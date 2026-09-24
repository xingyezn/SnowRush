import { CONFIG } from './Config';

/** Where the game looks for persisted scene tuning (kept under public/). */
export const SCENE_CONFIG_URL = 'config/scene.json';
/** Dev-only endpoint that writes SCENE_CONFIG_URL (see vite.config.ts). */
const SAVE_ENDPOINT = '/__scene-config';

export type SceneOverrides = Record<string, unknown>;

export interface CharacterOverride {
  yaw: number;
  boardOffset: { x: number; y: number; z: number };
}

let characterOverridesStore: Record<string, CharacterOverride> = {};

/** Per-roster placement override loaded from the config file (or none). */
export function getCharacterOverride(id: string): CharacterOverride | undefined {
  return characterOverridesStore[id];
}

/** Applies a partial scene override object onto CONFIG (top-level + course.*). */
export function applySceneOverrides(data: SceneOverrides): void {
  const config = CONFIG as unknown as Record<string, object>;
  for (const key of ['clouds', 'balloons', 'sun', 'light', 'mountains', 'terrain', 'items'] as const) {
    const value = data[key];
    if (value && typeof value === 'object') Object.assign(config[key], value as object);
  }
  const course = data['course'];
  if (course && typeof course === 'object') {
    for (const [key, value] of Object.entries(course)) {
      const section = (CONFIG.course as unknown as Record<string, unknown>)[key];
      if (section && typeof section === 'object' && value && typeof value === 'object') {
        Object.assign(section, value);
      }
    }
  }
  const characters = data['characters'];
  if (characters && typeof characters === 'object') {
    characterOverridesStore = characters as Record<string, CharacterOverride>;
  }
}

/** Loads `public/config/scene.json` if present and applies it. Never throws. */
export async function loadSceneOverrides(): Promise<void> {
  try {
    const response = await fetch(SCENE_CONFIG_URL, { cache: 'no-store' });
    if (!response.ok) return;
    applySceneOverrides((await response.json()) as SceneOverrides);
  } catch {
    // No override file yet — use the values baked into Config.ts.
  }
}

/** The current scene tuning, as a serialisable object. */
export function currentSceneOverrides(): SceneOverrides {
  const c = CONFIG.clouds;
  const b = CONFIG.balloons;
  const s = CONFIG.sun;
  const l = CONFIG.light;
  const m = CONFIG.mountains;
  const t = CONFIG.terrain;
  const cl = CONFIG.course.cliffs;
  const f = CONFIG.course.finish;
  const sp = CONFIG.course.snowpiles;
  return {
    clouds: {
      count: c.count,
      minRadius: c.minRadius,
      maxRadius: c.maxRadius,
      minHeight: c.minHeight,
      maxHeight: c.maxHeight,
      minScale: c.minScale,
      maxScale: c.maxScale,
      driftSpeed: c.driftSpeed,
    },
    balloons: {
      count: b.count,
      minRadius: b.minRadius,
      maxRadius: b.maxRadius,
      minHeight: b.minHeight,
      maxHeight: b.maxHeight,
      speed: b.speed,
      minScale: b.minScale,
      maxScale: b.maxScale,
    },
    sun: { azimuth: s.azimuth, elevation: s.elevation, distance: s.distance, size: s.size },
    light: {
      sunOffsetX: l.sunOffsetX,
      sunOffsetY: l.sunOffsetY,
      sunOffsetZ: l.sunOffsetZ,
      hemiIntensity: l.hemiIntensity,
      sunIntensity: l.sunIntensity,
    },
    mountains: {
      count: m.count,
      minRadius: m.minRadius,
      maxRadius: m.maxRadius,
      baseY: m.baseY,
      farHeight: m.farHeight,
    },
    terrain: {
      edgeStartOffset: t.edgeStartOffset,
      edgeSteepness: t.edgeSteepness,
      edgeHeight: t.edgeHeight,
    },
    course: {
      cliffs: { scaleMin: cl.scaleMin, scaleMax: cl.scaleMax },
      finish: { width: f.width, height: f.height },
      trees: { count: CONFIG.course.trees.count },
      rocks: { count: CONFIG.course.rocks.count },
      bushes: { count: CONFIG.course.bushes.count },
      snowpiles: { count: sp.count, visualHeight: sp.visualHeight },
      innerCliffs: { count: CONFIG.course.innerCliffs.count },
    },
    items: { count: CONFIG.items.count },
  };
}

/** Saves to `public/config/scene.json` via the dev endpoint. False if unavailable. */
export async function saveSceneOverrides(data: SceneOverrides): Promise<boolean> {
  try {
    const response = await fetch(SAVE_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data, null, 2),
    });
    return response.ok;
  } catch {
    return false;
  }
}
