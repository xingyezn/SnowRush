import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONFIG } from '../core/Config';

export interface ModelPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

/** A loaded, normalised model: base at y = 0, centred in XZ, height = target. */
export interface ModelAsset {
  parts: ModelPart[];
  radius: number;
  height: number;
}

/** Animated character: the object tree plus its clips, wrapped for placement. */
export interface RiderAsset {
  container: THREE.Group;
  animations: THREE.AnimationClip[];
  height: number;
}

export interface ModelLibrary {
  trees: ModelAsset[];
  rocks: ModelAsset[];
  bushes: ModelAsset[];
  rider: RiderAsset | null;
}

const TREE_URLS = [
  'models/pine_snow1.fbx',
  'models/pine_snow2.fbx',
  'models/pine1.fbx',
  'models/pine2.fbx',
];
const ROCK_URLS = ['models/rock1.fbx', 'models/rock2.fbx', 'models/rock3.fbx'];
const BUSH_URLS = ['models/bush1.fbx', 'models/bush2.fbx', 'models/bush3.fbx'];
const RIDER_URL = 'models/rider.fbx';

interface MeshLike {
  isMesh?: boolean;
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material | THREE.Material[];
  matrixWorld: THREE.Matrix4;
}

/** Splits a mesh into per-material geometries (handles multi-material groups). */
function collectParts(
  mesh: THREE.Mesh,
  into: Map<THREE.Material, THREE.BufferGeometry[]>,
): THREE.BufferGeometry[] {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const geometry = mesh.geometry;
  const index = geometry.getIndex();
  const groups = geometry.groups;
  const produced: THREE.BufferGeometry[] = [];

  const push = (material: THREE.Material | undefined, sub: THREE.BufferGeometry) => {
    if (!material) return;
    sub.applyMatrix4(mesh.matrixWorld);
    const list = into.get(material);
    if (list) list.push(sub);
    else into.set(material, [sub]);
    produced.push(sub);
  };

  if (materials.length > 1 && groups.length > 0 && index) {
    for (const group of groups) {
      const sub = geometry.clone();
      sub.clearGroups();
      sub.setIndex(
        new THREE.BufferAttribute(
          (index.array as unknown as number[]).slice(group.start, group.start + group.count) as never,
          1,
        ),
      );
      push(materials[group.materialIndex ?? 0], sub);
    }
    return produced;
  }

  const sub = geometry.clone();
  sub.clearGroups();
  push(materials[0], sub);
  return produced;
}

/** Merges an FBX object into parts grouped by material, normalised to targetHeight. */
function normalise(object: THREE.Object3D, targetHeight: number): ModelAsset {
  object.updateMatrixWorld(true);

  const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const collected: THREE.BufferGeometry[] = [];

  object.traverse((child) => {
    const mesh = child as unknown as MeshLike;
    if (!mesh.isMesh || !mesh.geometry) return;
    collected.push(...collectParts(child as THREE.Mesh, byMaterial));
  });

  if (collected.length === 0) throw new Error('model contains no meshes');

  const bounds = new THREE.Box3();
  for (const geometry of collected) {
    geometry.computeBoundingBox();
    bounds.union(geometry.boundingBox as THREE.Box3);
  }
  const height = bounds.max.y - bounds.min.y;
  const scale = targetHeight / Math.max(height, 0.0001);
  const centerX = (bounds.min.x + bounds.max.x) / 2;
  const centerZ = (bounds.min.z + bounds.max.z) / 2;
  const minY = bounds.min.y;

  const parts: ModelPart[] = [];
  for (const [material, geometries] of byMaterial) {
    const merged =
      geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false) ?? geometries[0];
    merged.translate(-centerX, -minY, -centerZ);
    merged.scale(scale, scale, scale);
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    parts.push({ geometry: merged, material });
  }

  const finalBounds = new THREE.Box3();
  for (const part of parts) finalBounds.union(part.geometry.boundingBox as THREE.Box3);

  return {
    parts,
    radius: Math.max(finalBounds.max.x - finalBounds.min.x, finalBounds.max.z - finalBounds.min.z) / 2,
    height: finalBounds.max.y - finalBounds.min.y,
  };
}

/** Simple cone used if a model file cannot be loaded. */
function fallbackAsset(color: number, targetHeight: number): ModelAsset {
  const geometry = new THREE.ConeGeometry(targetHeight * 0.28, targetHeight, 6);
  geometry.translate(0, targetHeight / 2, 0);
  return {
    parts: [
      {
        geometry,
        material: new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }),
      },
    ],
    radius: targetHeight * 0.28,
    height: targetHeight,
  };
}

/** Recolours every part of an asset (used to match the rocks to the palette). */
function tint(asset: ModelAsset, color: number): ModelAsset {
  for (const part of asset.parts) {
    const material = part.material.clone();
    if ('color' in material) (material as THREE.MeshStandardMaterial).color.setHex(color);
    part.material = material;
  }
  return asset;
}

async function loadGroup(
  loader: FBXLoader,
  urls: string[],
  targetHeight: number,
  fallbackColor: number,
  tintColor?: number,
): Promise<ModelAsset[]> {
  const assets: ModelAsset[] = [];
  for (const url of urls) {
    try {
      const object = await loader.loadAsync(url);
      const asset = normalise(object, targetHeight);
      assets.push(tintColor === undefined ? asset : tint(asset, tintColor));
    } catch (error) {
      console.warn(`SnowRush: could not load ${url}, using fallback`, error);
      assets.push(fallbackAsset(fallbackColor, targetHeight));
    }
  }
  return assets;
}

async function loadRider(loader: FBXLoader): Promise<RiderAsset | null> {
  try {
    const object = await loader.loadAsync(RIDER_URL);
    object.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(object);
    const height = bounds.max.y - bounds.min.y;
    const scale = CONFIG.player.riderHeight / Math.max(height, 0.0001);

    // Recolour the outfit so the rider reads against the snow.
    const outfit: Record<string, number> = {
      Shirt: CONFIG.colors.jacket,
      Pants: CONFIG.colors.pants,
      Socks: CONFIG.colors.pants,
      Hair: CONFIG.colors.helmet,
    };
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        const color = outfit[material.name];
        if (color === undefined || !('color' in material)) continue;
        (material as THREE.MeshStandardMaterial).color.setHex(color);
      }
    });

    // Scale/offset live on a container so the clips cannot overwrite them.
    const container = new THREE.Group();
    container.scale.setScalar(scale);
    container.position.y = -bounds.min.y * scale;
    container.add(object);

    return { container, animations: object.animations ?? [], height: CONFIG.player.riderHeight };
  } catch (error) {
    console.warn(`SnowRush: could not load ${RIDER_URL}, using procedural rider`, error);
    return null;
  }
}

/** Model library built from primitives; used by headless tests and as a fallback. */
export function createFallbackLibrary(): ModelLibrary {
  return {
    trees: [fallbackAsset(CONFIG.colors.treeFoliage, CONFIG.course.trees.visualHeight)],
    rocks: [fallbackAsset(CONFIG.colors.rock, CONFIG.course.rocks.visualHeight)],
    bushes: [fallbackAsset(CONFIG.colors.treeFoliage, CONFIG.course.bushes.visualHeight)],
    rider: null,
  };
}

/** Loads all CC0 Quaternius models (see public/models/LICENSE.txt). */
export async function loadModelLibrary(): Promise<ModelLibrary> {
  const loader = new FBXLoader();
  const [trees, rocks, bushes, rider] = await Promise.all([
    loadGroup(loader, TREE_URLS, CONFIG.course.trees.visualHeight, CONFIG.colors.treeFoliage),
    loadGroup(
      loader,
      ROCK_URLS,
      CONFIG.course.rocks.visualHeight,
      CONFIG.colors.rock,
      CONFIG.colors.rock,
    ),
    loadGroup(loader, BUSH_URLS, CONFIG.course.bushes.visualHeight, CONFIG.colors.treeFoliage),
    loadRider(loader),
  ]);
  return { trees, rocks, bushes, rider };
}
