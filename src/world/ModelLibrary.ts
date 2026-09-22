import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
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

/** A selectable rider on the start menu. */
export interface CharacterOption {
  id: string;
  name: string;
  rider: RiderAsset | null;
  /** Yaw correction applied by PlayerVisual (model forward vs. game forward). */
  yaw: number;
}

export interface ModelLibrary {
  trees: ModelAsset[];
  rocks: ModelAsset[];
  bushes: ModelAsset[];
  characters: CharacterOption[];
}

// Detailed CC0 Quaternius pines (higher-poly than the old pack) plus one
// flat-shaded snow-capped pine for variety.
const TREE_URLS = [
  'models/pine_quat_a.glb',
  'models/pine_quat_b.glb',
  'models/pine_quat_a.glb',
  'models/pine_quat_snow.glb',
];
const ROCK_URLS = [
  'models/rock_quat_a.glb',
  'models/rock_quat_b.glb',
  'models/rock_quat_c.glb',
  'models/rock_quat_snow.glb',
];
const BUSH_URLS = ['models/bush1.fbx', 'models/bush2.fbx', 'models/bush3.fbx'];

/**
 * Selectable riders. These are the project owner's GLB models, decimated and
 * auto-rigged (simple "Idle" sway) in Blender. See public/models/LICENSE.txt.
 */
const CHARACTERS = [
  { id: 'runer', name: 'RUNER', url: 'models/runer.glb' },
  { id: 'panda', name: 'PANDA', url: 'models/panda.glb' },
] as const;

interface MeshLike {
  isMesh?: boolean;
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material | THREE.Material[];
  matrixWorld: THREE.Matrix4;
}

interface LoadedObject {
  object: THREE.Object3D;
  animations: THREE.AnimationClip[];
}

const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader();

/**
 * Loads a model by extension: `.glb` / `.gltf` via GLTFLoader, otherwise FBX.
 * Both return the same shape so callers stay format-agnostic.
 */
async function loadObject(url: string): Promise<LoadedObject> {
  const extension = url.split('.').pop()?.toLowerCase();
  if (extension === 'glb' || extension === 'gltf') {
    const gltf = await gltfLoader.loadAsync(url);
    return { object: gltf.scene, animations: gltf.animations ?? [] };
  }
  const object = await fbxLoader.loadAsync(url);
  return { object, animations: object.animations ?? [] };
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

  if (materials.length > 1 && groups.length > 0) {
    for (const group of groups) {
      const sub = new THREE.BufferGeometry();
      for (const name of Object.keys(geometry.attributes)) {
        const attribute = geometry.attributes[name] as THREE.BufferAttribute;
        const itemSize = attribute.itemSize;
        if (index) {
          sub.setAttribute(name, attribute.clone());
        } else {
          // Non-indexed: group ranges address vertices directly.
          const array = (attribute.array as unknown as number[]).slice(
            group.start * itemSize,
            (group.start + group.count) * itemSize,
          );
          sub.setAttribute(
            name,
            new THREE.BufferAttribute(array as never, itemSize, attribute.normalized),
          );
        }
      }
      if (index) {
        sub.setIndex(
          new THREE.BufferAttribute(
            (index.array as unknown as number[]).slice(
              group.start,
              group.start + group.count,
            ) as never,
            1,
          ),
        );
      }
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

/**
 * Adds a procedural snow layer to a material: up-facing surfaces fade toward
 * white. Uses objectNormal.y, which matches world up for our Y-rotated,
 * uniformly-scaled tree instances.
 */
function applySnowDusting(material: THREE.Material, coverage: number, amount: number): void {
  const target = material as THREE.MeshStandardMaterial;
  target.onBeforeCompile = (shader) => {
    shader.uniforms.snowCoverage = { value: coverage };
    shader.uniforms.snowAmount = { value: amount };
    shader.vertexShader = `varying float vSnowUp;\n${shader.vertexShader}`.replace(
      '#include <beginnormal_vertex>',
      '#include <beginnormal_vertex>\n  vSnowUp = objectNormal.y;',
    );
    shader.fragmentShader =
      `varying float vSnowUp;\nuniform float snowCoverage;\nuniform float snowAmount;\n${shader.fragmentShader}`.replace(
        '#include <color_fragment>',
        `#include <color_fragment>\n  {
    float snow = smoothstep(snowCoverage, snowCoverage + 0.25, vSnowUp) * snowAmount;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.96, 1.0), snow);
  }`,
      );
  };
  target.customProgramCacheKey = () => `snow-${coverage}-${amount}`;
  target.needsUpdate = true;
}

async function loadGroup(
  urls: string[],
  targetHeight: number,
  fallbackColor: number,
): Promise<ModelAsset[]> {
  const assets: ModelAsset[] = [];
  for (const url of urls) {
    try {
      const { object } = await loadObject(url);
      const asset = normalise(object, targetHeight);
      assets.push(asset);
    } catch (error) {
      console.warn(`SnowRush: could not load ${url}, using fallback`, error);
      assets.push(fallbackAsset(fallbackColor, targetHeight));
    }
  }
  return assets;
}

/** Scales a rider to CONFIG.player.riderHeight and aligns its feet to y = 0. */
function buildRider(object: THREE.Object3D, animations: THREE.AnimationClip[]): RiderAsset {
  object.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(object);
  const height = bounds.max.y - bounds.min.y;
  const scale = CONFIG.player.riderHeight / Math.max(height, 0.0001);

  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.frustumCulled = false;
  });

  // Scale/offset live on a container so the clips cannot overwrite them.
  const container = new THREE.Group();
  container.scale.setScalar(scale);
  container.position.y = -bounds.min.y * scale;
  container.add(object);

  return { container, animations, height: CONFIG.player.riderHeight };
}

/** Loads every selectable rider (missing files fall back to the primitive). */
async function loadCharacters(): Promise<CharacterOption[]> {
  const options = await Promise.all(
    CHARACTERS.map(async (def): Promise<CharacterOption> => {
      try {
        const { object, animations } = await loadObject(def.url);
        return {
          id: def.id,
          name: def.name,
          rider: buildRider(object, animations),
          yaw: CONFIG.player.riderYaw,
        };
      } catch (error) {
        console.warn(`SnowRush: could not load ${def.url}`, error);
        return { id: def.id, name: def.name, rider: null, yaw: CONFIG.player.riderYaw };
      }
    }),
  );
  return options;
}

/** Model library built from primitives; used by headless tests and as a fallback. */
export function createFallbackLibrary(): ModelLibrary {
  return {
    trees: [fallbackAsset(CONFIG.colors.treeFoliage, CONFIG.course.trees.visualHeight)],
    rocks: [fallbackAsset(CONFIG.colors.rock, CONFIG.course.rocks.visualHeight)],
    bushes: [fallbackAsset(CONFIG.colors.treeFoliage, CONFIG.course.bushes.visualHeight)],
    characters: [],
  };
}

/** Loads all CC0 models (see public/models/LICENSE.txt). FBX or GLB. */
export async function loadModelLibrary(): Promise<ModelLibrary> {
  const [trees, rocks, bushes, characters] = await Promise.all([
    // Textured pines keep their baked colours (no tint).
    loadGroup(TREE_URLS, CONFIG.course.trees.visualHeight, CONFIG.colors.treeFoliage),
    // Keep the models' own colours so the snow-capped rock stays white.
    loadGroup(ROCK_URLS, CONFIG.course.rocks.visualHeight, CONFIG.colors.rock),
    loadGroup(BUSH_URLS, CONFIG.course.bushes.visualHeight, CONFIG.colors.treeFoliage),
    loadCharacters(),
  ]);

  const { snowCoverage, snowAmount } = CONFIG.course.trees;
  for (const tree of trees) {
    for (const part of tree.parts) applySnowDusting(part.material, snowCoverage, snowAmount);
  }

  return { trees, rocks, bushes, characters };
}
