import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import { Rng } from '../core/Rng';
import type { ModelAsset } from './ModelLibrary';

/**
 * Distant peaks framing the course. The loaded far-range model is instanced on
 * a large ring and follows the rider, so the range always reads at a fixed
 * distance. If the model failed to load, low-poly cones are used instead.
 *
 * The range asset is wide and flat, so it is scaled non-uniformly (squeezed to
 * `farWidth`, stretched to `farHeight`). That keeps the ring outside the
 * terrain, otherwise the huge footprint pokes up through the course in the
 * second half.
 */
export class MountainBackdrop {
  private readonly meshes: THREE.InstancedMesh[] = [];

  constructor(scene: THREE.Scene, far: ModelAsset | null) {
    const c = CONFIG.mountains;
    const rng = new Rng(CONFIG.course.seed ^ 0x9e3779b9);

    if (far) {
      // Peaks sit beyond the fog, so their materials must ignore it.
      for (const part of far.parts) (part.material as THREE.MeshStandardMaterial).fog = false;
      this.meshes.push(...buildRange(scene, far, c, rng));
    } else {
      this.meshes.push(...buildFallbackRing(scene, c, rng));
    }
  }

  /**
   * Keeps the range centred on the rider so the peaks stay at a fixed distance.
   * The bases sit below the lowest terrain (see CONFIG.mountains.baseY), so the
   * peaks always fill the horizon instead of opening a band of sky between the
   * terrain edge and the mountains.
   */
  update(x: number, z: number): void {
    for (const mesh of this.meshes) mesh.position.set(x, 0, z);
  }

  /** Removes the range meshes (shared model geometry/materials are kept). */
  dispose(scene: THREE.Scene): void {
    for (const mesh of this.meshes) {
      scene.remove(mesh);
      mesh.dispose();
    }
    this.meshes.length = 0;
  }
}

/** Instances the far-range model around the rider on a large ring. */
function buildRange(
  scene: THREE.Scene,
  far: ModelAsset,
  c: typeof CONFIG.mountains,
  rng: Rng,
): THREE.InstancedMesh[] {
  const assetHeight = Math.max(far.height, 1e-4);
  const meshes = far.parts.map((part) => {
    const mesh = new THREE.InstancedMesh(part.geometry, part.material, c.count);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    scene.add(mesh);
    return mesh;
  });

  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < c.count; i++) {
    const angle = (i / c.count) * Math.PI * 2 + rng.range(-0.05, 0.05);
    const radius = rng.range(c.minRadius, c.maxRadius);
    // Uniform scale keeps the peaks' natural silhouette (no sharp stretching).
    const height = rng.range(c.farHeight * 0.9, c.farHeight * 1.1);
    quat.setFromAxisAngle(up, rng.range(0, Math.PI * 2));
    position.set(Math.cos(angle) * radius, c.baseY, Math.sin(angle) * radius);
    scale.setScalar(height / assetHeight);
    matrix.compose(position, quat, scale);
    for (const mesh of meshes) mesh.setMatrixAt(i, matrix);
  }
  for (const mesh of meshes) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }
  return meshes;
}

/** Cone-based range used when the mountain model is unavailable. */
function buildFallbackRing(
  scene: THREE.Scene,
  c: typeof CONFIG.mountains,
  rng: Rng,
): THREE.InstancedMesh[] {
  const geometry = new THREE.ConeGeometry(1, 1, 5);
  geometry.translate(0, 0.5, 0);
  const material = new THREE.MeshStandardMaterial({
    color: c.color,
    roughness: 1,
    flatShading: true,
    fog: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.snowLine = { value: c.snowLine };
    shader.uniforms.snowColor = { value: new THREE.Color(c.snowColor) };
    shader.vertexShader = `varying float vPeakY;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n  vPeakY = position.y;',
    );
    shader.fragmentShader =
      `varying float vPeakY;\nuniform float snowLine;\nuniform vec3 snowColor;\n${shader.fragmentShader}`.replace(
        '#include <color_fragment>',
        `#include <color_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, snowColor, smoothstep(snowLine, snowLine + 0.18, vPeakY));`,
      );
  };
  material.customProgramCacheKey = () => `mountain-snow-${c.snowLine}`;

  const mesh = new THREE.InstancedMesh(geometry, material, c.count);
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < c.count; i++) {
    const angle = (i / c.count) * Math.PI * 2 + rng.range(-0.04, 0.04);
    const radius = rng.range(c.minRadius, c.maxRadius);
    const height = rng.range(c.minHeight, c.maxHeight);
    const baseRadius = height * rng.range(1.1, 1.9);
    quat.setFromAxisAngle(up, rng.range(0, Math.PI * 2));
    position.set(Math.cos(angle) * radius, c.baseY, Math.sin(angle) * radius);
    scale.set(baseRadius, height, baseRadius);
    matrix.compose(position, quat, scale);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  scene.add(mesh);
  return [mesh];
}
