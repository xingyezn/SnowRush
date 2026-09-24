import { CONFIG } from '../core/Config';
import { Rng } from '../core/Rng';

export type TerrainConfig = typeof CONFIG.terrain;
export type CourseConfig = typeof CONFIG.course;

/** Extra fields the game may add on top of the base course config. */
export interface WorldExtras {
  /** Tile the 7 base sections this many times (endless). */
  repeats: number;
  /** Endless has no finish line. */
  noFinish: boolean;
  /** Whether the course spawns collectible items. */
  items: boolean;
}

let activeTerrain: TerrainConfig = CONFIG.terrain;
let activeCourse: CourseConfig = CONFIG.course;
let activeExtras: WorldExtras = { repeats: 1, noFinish: false, items: true };

export const getTerrainConfig = (): TerrainConfig => activeTerrain;
export const getCourseConfig = (): CourseConfig => activeCourse;
export const getWorldExtras = (): WorldExtras => activeExtras;

export function setWorldConfig(
  terrain: TerrainConfig,
  course: CourseConfig,
  extras: WorldExtras,
): void {
  activeTerrain = terrain;
  activeCourse = course;
  activeExtras = extras;
}

export function resetWorldConfig(): void {
  activeTerrain = CONFIG.terrain;
  activeCourse = CONFIG.course;
  activeExtras = { repeats: 1, noFinish: false, items: true };
}

/** A randomized terrain variant (shape + waves), length optionally extended. */
export function randomTerrain(seed: number, lengthScale = 1): TerrainConfig {
  const rng = new Rng(seed);
  const base = CONFIG.terrain;
  return {
    ...base,
    length: Math.round(base.length * lengthScale),
    curveAmp1: base.curveAmp1 * rng.range(0.4, 1.6),
    curveAmp2: base.curveAmp2 * rng.range(0.2, 1.8),
    curveFreq1: base.curveFreq1 * rng.range(0.7, 1.3),
    curveFreq2: base.curveFreq2 * rng.range(0.7, 1.3),
    curvePhase1: rng.range(0, Math.PI * 2),
    curvePhase2: rng.range(0, Math.PI * 2),
    largeWaveAmp: base.largeWaveAmp * rng.range(0.6, 1.5),
    largeWaveFreq: base.largeWaveFreq * rng.range(0.7, 1.4),
    crossWaveAmp: base.crossWaveAmp * rng.range(0.6, 1.4),
    baseSlope: base.baseSlope * rng.range(0.9, 1.15),
  };
}

/** A randomized course variant (seed + mildly jittered spacing). */
export function randomCourse(seed: number): CourseConfig {
  const rng = new Rng(seed ^ 0x5f3759df);
  const base = CONFIG.course;
  return {
    ...base,
    seed,
    gates: { ...base.gates, spacing: Math.round(base.gates.spacing * rng.range(0.8, 1.25)) },
    trees: { ...base.trees, count: Math.round(base.trees.count * rng.range(0.8, 1.3)) },
    rocks: { ...base.rocks, count: Math.round(base.rocks.count * rng.range(0.7, 1.4)) },
    ramps: { ...base.ramps },
  };
}
