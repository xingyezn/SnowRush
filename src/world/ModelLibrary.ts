import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONFIG } from '../core/Config';
import { getCharacterOverride } from '../core/SceneOverrides';

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
  /** True when the model ships its own snowboard (hides the game board). */
  hasBoard: boolean;
}

/** Player snowboard, authored flat: deck base at y = 0, length along Z. */
export interface BoardAsset {
  object: THREE.Object3D;
}

/** A selectable rider on the start menu. */
export interface CharacterOption {
  id: string;
  name: string;
  rider: RiderAsset | null;
  /** Yaw correction applied by PlayerVisual (model forward vs. game forward). */
  yaw: number;
  /** Fine placement on the board (metres, board-local: z = length, y = up). */
  boardOffset: { x: number; y: number; z: number };
}

export interface ModelLibrary {
  trees: ModelAsset[];
  rocks: ModelAsset[];
  bushes: ModelAsset[];
  cliffs: ModelAsset[];
  snowpiles: ModelAsset[];
  clouds: ModelAsset[];
  fences: ModelAsset[];
  ramps: ModelAsset[];
  balloons: ModelAsset[];
  characters: CharacterOption[];
  board: BoardAsset | null;
  mountainFar: ModelAsset | null;
  sun: ModelAsset | null;
  finishArch: ModelAsset | null;
}

// The owner's generated, split + scaled models (tools/prepare_generated_batch.py).
// The earlier CC0 / pine assets are kept on disk but no longer referenced.
const TREE_URLS = [
  'models/tree_gen_a.glb',
  'models/tree_gen_b.glb',
  'models/tree_gen_c.glb',
  'models/tree_gen_d.glb',
];
const ROCK_URLS = ['models/rock_gen_a.glb', 'models/rock_gen_b.glb', 'models/rock_gen_c.glb'];
// Grass replaces the old bushes.
const BUSH_URLS = [
  'models/grass_gen_a.glb',
  'models/grass_gen_b.glb',
  'models/grass_gen_c.glb',
  'models/grass_gen_d.glb',
  'models/grass_gen_e.glb',
  'models/grass_gen_f.glb',
  'models/grass_gen_g.glb',
];
const CLIFF_URLS = ['models/cliff_gen_a.glb', 'models/cliff_gen_b.glb', 'models/cliff_gen_c.glb'];
const FENCE_URLS = [
  'models/fence_gen_a.glb',
  'models/fence_gen_b.glb',
  'models/fence_gen_c.glb',
  'models/fence_gen_d.glb',
];
const SNOWPILE_URLS = [
  'models/snowpile_gen_a.glb',
  'models/snowpile_gen_b.glb',
  'models/snowpile_gen_c.glb',
  'models/snowpile_gen_d.glb',
];
const CLOUD_URLS = ['models/cloud_gen_a.glb', 'models/cloud_gen_b.glb', 'models/cloud_gen_c.glb'];
const RAMP_URLS = ['models/ramp_gen_a.glb', 'models/ramp_gen_b.glb'];
const BALLOON_URLS = [
  'models/balloon_gen_a.glb',
  'models/balloon_gen_b.glb',
  'models/balloon_gen_c.glb',
  'models/balloon_gen_d.glb',
];
const MOUNTAIN_FAR_URL = 'models/mountain_far_gen.glb';
const SUN_URL = 'models/sun_gen.glb';
const FINISH_ARCH_URL = 'models/finish_arch_gen.glb';
const BOARD_URL = 'models/panda_board_gen.glb';

/**
 * Selectable riders. These are the project owner's GLB models, decimated and
 * auto-rigged (simple "Idle" sway) in Blender. See public/models/LICENSE.txt.
 */
interface CharacterDef {
  id: string;
  name: string;
  url: string;
  yaw: number;
  /** True when the model includes its own snowboard. */
  ownBoard?: boolean;
  /** Nudge the rider on the board (board-local metres: z = length, y = up). */
  boardOffset?: { x?: number; y?: number; z?: number };
}

// Snowboarders stand side-on across the board instead of facing straight down
// the hill, so the generated riders get this extra yaw on top of the +Z fix.
const STANCE_YAW = Math.PI * 0.45;

const CHARACTERS: CharacterDef[] = [
  { id: 'panda', name: 'PANDA', url: 'models/panda.glb', yaw: CONFIG.player.riderYaw },
  { id: 'runer', name: 'RUNER', url: 'models/runer.glb', yaw: CONFIG.player.riderYaw },
  // Generated riders: model forward is +Z, turned side-on to the board
  // (yaw = STANCE_YAW − π). Offsets tuned with the admin panel (?admin=1).
  { id: 'fox', name: 'FOX', url: 'models/fox_board_gen.glb', yaw: STANCE_YAW - Math.PI, boardOffset: { x: -0.115, y: 0.185, z: 0.075 } },
  { id: 'cat', name: 'CAT', url: 'models/rider_cat_rigged.glb', yaw: STANCE_YAW - Math.PI, boardOffset: { x: 0.12, y: -0.005, z: 0.105 } },
  // HERO (rigged FBX) is hidden for now; keep the asset. Uncomment to restore.
  // { id: 'hero', name: 'HERO', url: 'models/rider_hero_rigged.glb', yaw: STANCE_YAW - Math.PI },
  // Procedural panda snowboarder is currently hidden (ugly). The asset, the
  // build script and CharacterAnimator are kept; uncomment to bring it back.
  // { id: 'panda_boarder', name: 'PANDA BOARDER', url: 'models/panda_snowboarder.glb', yaw: Math.PI, ownBoard: true },
];

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

/** Loads one model, falling back to a primitive cone if the file is missing. */
async function loadAsset(url: string, targetHeight: number, fallbackColor: number): Promise<ModelAsset> {
  try {
    const { object } = await loadObject(url);
    return normalise(object, targetHeight);
  } catch (error) {
    console.warn(`SnowRush: could not load ${url}, using fallback`, error);
    return fallbackAsset(fallbackColor, targetHeight);
  }
}

/** Loads one model, returning null on failure so callers can use their own fallback. */
async function loadOptionalAsset(url: string, targetHeight: number): Promise<ModelAsset | null> {
  try {
    const { object } = await loadObject(url);
    return normalise(object, targetHeight);
  } catch (error) {
    console.warn(`SnowRush: could not load ${url}`, error);
    return null;
  }
}

async function loadGroup(
  urls: string[],
  targetHeight: number,
  fallbackColor: number,
): Promise<ModelAsset[]> {
  return Promise.all(urls.map((url) => loadAsset(url, targetHeight, fallbackColor)));
}

/** Scales a rider to CONFIG.player.riderHeight and aligns its feet to y = 0. */
function buildRider(
  object: THREE.Object3D,
  animations: THREE.AnimationClip[],
  hasBoard: boolean,
): RiderAsset {
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

  return { container, animations, height: CONFIG.player.riderHeight, hasBoard };
}

/** Loads every selectable rider (missing files fall back to the primitive). */
async function loadCharacters(): Promise<CharacterOption[]> {
  const options = await Promise.all(
    CHARACTERS.map(async (def): Promise<CharacterOption> => {
      try {
        const { object, animations } = await loadObject(def.url);
        const override = getCharacterOverride(def.id);
        return {
          id: def.id,
          name: def.name,
          rider: buildRider(object, animations, def.ownBoard ?? false),
          yaw: override?.yaw ?? def.yaw,
          boardOffset: override?.boardOffset ?? {
            x: def.boardOffset?.x ?? 0,
            y: def.boardOffset?.y ?? 0,
            z: def.boardOffset?.z ?? 0,
          },
        };
      } catch (error) {
        console.warn(`SnowRush: could not load ${def.url}`, error);
        return {
          id: def.id,
          name: def.name,
          rider: null,
          yaw: def.yaw,
          boardOffset: { x: 0, y: 0, z: 0 },
        };
      }
    }),
  );
  return options;
}

/** Loads a player-imported character (object URL) into a RiderAsset. */
export async function loadRiderFromUrl(url: string): Promise<RiderAsset | null> {
  try {
    const { object, animations } = await loadObject(url);
    return buildRider(object, animations, false);
  } catch (error) {
    console.warn('SnowRush: could not load the local rider model', error);
    return null;
  }
}

/** Loads the player's snowboard; null keeps PlayerVisual's primitive board. */
async function loadBoard(): Promise<BoardAsset | null> {  try {
    const { object } = await loadObject(BOARD_URL);
    return { object };
  } catch (error) {
    console.warn(`SnowRush: could not load ${BOARD_URL}`, error);
    return null;
  }
}

/** Model library built from primitives; used by headless tests and as a fallback. */
export function createFallbackLibrary(): ModelLibrary {
  return {
    trees: [fallbackAsset(CONFIG.colors.treeFoliage, CONFIG.course.trees.visualHeight)],
    rocks: [fallbackAsset(CONFIG.colors.rock, CONFIG.course.rocks.visualHeight)],
    bushes: [fallbackAsset(CONFIG.colors.treeFoliage, CONFIG.course.bushes.visualHeight)],
    cliffs: [fallbackAsset(CONFIG.colors.rock, CONFIG.course.cliffs.visualHeight)],
    snowpiles: [fallbackAsset(0xf3f8ff, CONFIG.course.snowpiles.visualHeight)],
    clouds: [],
    fences: [],
    ramps: [],
    balloons: [],
    characters: [],
    board: null,
    mountainFar: null,
    sun: null,
    finishArch: null,
  };
}

/** Loads all generated models (see public/models/LICENSE.txt). FBX or GLB. */
export async function loadModelLibrary(): Promise<ModelLibrary> {
  const [trees, rocks, bushes, cliffs, snowpiles, clouds, fences, ramps, balloons, characters, board, mountainFar, sun, finishArch] =
    await Promise.all([
      loadGroup(TREE_URLS, CONFIG.course.trees.visualHeight, CONFIG.colors.treeFoliage),
      loadGroup(ROCK_URLS, CONFIG.course.rocks.visualHeight, CONFIG.colors.rock),
      loadGroup(BUSH_URLS, CONFIG.course.bushes.visualHeight, CONFIG.colors.treeFoliage),
      loadGroup(CLIFF_URLS, CONFIG.course.cliffs.visualHeight, CONFIG.colors.rock),
      loadGroup(SNOWPILE_URLS, CONFIG.course.snowpiles.visualHeight, 0xf3f8ff),
      loadGroup(CLOUD_URLS, CONFIG.clouds.modelHeight, CONFIG.clouds.color),
      loadGroup(FENCE_URLS, CONFIG.course.boundary.postHeight, CONFIG.colors.boundaryPost),
      loadGroup(RAMP_URLS, CONFIG.course.ramps.height, CONFIG.colors.ramp),
      loadGroup(BALLOON_URLS, CONFIG.balloons.modelHeight, 0xff5a4a),
      loadCharacters(),
      loadBoard(),
      loadOptionalAsset(MOUNTAIN_FAR_URL, CONFIG.mountains.modelHeight),
      loadOptionalAsset(SUN_URL, CONFIG.sun.modelHeight),
      loadOptionalAsset(FINISH_ARCH_URL, CONFIG.course.finish.height),
    ]);

  const { snowCoverage, snowAmount } = CONFIG.course.trees;
  for (const tree of trees) {
    for (const part of tree.parts) applySnowDusting(part.material, snowCoverage, snowAmount);
  }

  return {
    trees,
    rocks,
    bushes,
    cliffs,
    snowpiles,
    clouds,
    fences,
    ramps,
    balloons,
    characters,
    board,
    mountainFar,
    sun,
    finishArch,
  };
}
