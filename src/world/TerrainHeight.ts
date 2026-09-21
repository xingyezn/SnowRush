import { CONFIG } from '../core/Config';

/**
 * Single source of truth for terrain elevation.
 * Both the render mesh and the Rapier heightfield sample this function.
 *
 * Axis convention: -Z is downhill, +X is right, +Y is up.
 * The base slope dominates every wave derivative, so dy/dz stays positive and
 * the course is guaranteed to descend toward -Z (no impassable uphill).
 */
/**
 * Lateral offset of the course centre line at a given z. The corridor, the
 * guardrails, the cliff walls and all object placement follow this curve, so the
 * run meanders instead of running dead straight.
 */
export function courseCenterX(z: number): number {
  const t = CONFIG.terrain;
  return (
    t.curveAmp1 * Math.sin(z * t.curveFreq1 + t.curvePhase1) +
    t.curveAmp2 * Math.sin(z * t.curveFreq2 + t.curvePhase2)
  );
}

export function terrainHeight(x: number, z: number): number {
  const t = CONFIG.terrain;

  const base = t.baseSlope * z;
  const largeWave = t.largeWaveAmp * Math.sin(z * t.largeWaveFreq);
  const crossWave =
    t.crossWaveAmp * Math.sin(x * t.crossWaveFreq + z * t.crossWaveFreq * t.crossWaveZRatio);
  const smallNoise =
    t.smallNoiseAmp * Math.sin(x * t.smallNoiseFreqX) * Math.cos(z * t.smallNoiseFreqZ);

  // Cliff walls outside the playable corridor so the terrain edge is never a
  // visible void. Measured from the meandering centre line, so the walls follow
  // the course; the downhill slope is unaffected.
  const edge = Math.max(0, Math.abs(x - courseCenterX(z)) - (t.playWidth / 2 + t.edgeStartOffset));
  const edgeRise = edge * edge * t.edgeRiseFactor;

  return base + largeWave + crossWave + smallNoise + edgeRise;
}

export interface NormalComponents {
  x: number;
  y: number;
  z: number;
}

/** Surface normal via central differences (no Three.js dependency). */
export function terrainNormalComponents(x: number, z: number, eps = 0.5): NormalComponents {
  const left = terrainHeight(x - eps, z);
  const right = terrainHeight(x + eps, z);
  const down = terrainHeight(x, z - eps);
  const up = terrainHeight(x, z + eps);

  const nx = left - right;
  const nz = down - up;
  const ny = 2 * eps;
  const length = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / length, y: ny / length, z: nz / length };
}
