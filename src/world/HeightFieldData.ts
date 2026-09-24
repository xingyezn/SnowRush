import { terrainHeight } from './TerrainHeight';
import { getTerrainConfig } from './WorldConfig';

export interface HeightFieldData {
  /** Subdivisions along the z axis. */
  nrows: number;
  /** Subdivisions along the x axis. */
  ncols: number;
  heights: Float32Array;
  scale: { x: number; y: number; z: number };
}

/**
 * Builds the Rapier heightfield buffer from the same terrainHeight() the render
 * mesh uses, guaranteeing visual and physics terrain agree.
 *
 * Rapier stores heights column-major: heights[i + j * (nrows + 1)], where i
 * indexes rows (z axis) and j indexes columns (x axis):
 *   x = (j / ncols - 0.5) * scale.x
 *   z = (i / nrows - 0.5) * scale.z
 */
export function buildHeightFieldData(): HeightFieldData {
  const t = getTerrainConfig();
  const nrows = t.segmentsZ;
  const ncols = t.segmentsX;
  const scale = { x: t.width, y: 1, z: t.length };
  const heights = new Float32Array((nrows + 1) * (ncols + 1));

  for (let j = 0; j <= ncols; j++) {
    const x = (j / ncols - 0.5) * scale.x;
    for (let i = 0; i <= nrows; i++) {
      const z = (i / nrows - 0.5) * scale.z;
      heights[i + j * (nrows + 1)] = terrainHeight(x, z);
    }
  }

  return { nrows, ncols, heights, scale };
}
