import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONFIG } from '../core/Config';
import { Rng } from '../core/Rng';
import type { ModelAsset } from './ModelLibrary';

/**
 * Low-poly clouds high above the course. They follow the rider so they always
 * sit in the sky, and drift slowly for a little life. No physics, no shadows,
 * no fog (fog would erase them at this distance).
 *
 * Uses the loaded cloud models when available; otherwise falls back to merged
 * sphere puffs so the sky is never empty.
 */
export class Clouds {
  private readonly meshes: THREE.InstancedMesh[] = [];

  constructor(scene: THREE.Scene, models: ModelAsset[]) {
    const c = CONFIG.clouds;
    const rng = new Rng(CONFIG.course.seed ^ 0x51ed270b);
    const variants = models.length > 0 ? models : [proceduralCloud()];
    // Clouds sit beyond the fog (ignore it) and get a soft self-lit fill so the
    // shaded side reads as a bright cloud instead of a dark storm cloud.
    for (const asset of variants) {
      for (const part of asset.parts) {
        const material = part.material as THREE.MeshStandardMaterial;
        material.fog = false;
        if (material.emissive) {
          material.emissiveMap = material.map ?? null;
          material.emissive.set(0xffffff);
          material.emissiveIntensity = 0.65;
        }
        material.needsUpdate = true;
      }
    }

    const slots = variants.map(() => 0);
    const assignment: number[] = [];
    for (let i = 0; i < c.count; i++) {
      const variant = i % variants.length;
      assignment.push(variant);
      slots[variant]++;
    }

    const byVariant = variants.map((asset, variant) => {
      if (slots[variant] === 0) return [];
      return asset.parts.map((part) => {
        const mesh = new THREE.InstancedMesh(part.geometry, part.material, slots[variant]);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        scene.add(mesh);
        return mesh;
      });
    });

    const cursors = variants.map(() => 0);
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < c.count; i++) {
      const variant = assignment[i];
      const angle = (i / c.count) * Math.PI * 2 + rng.range(-0.25, 0.25);
      const radius = rng.range(c.minRadius, c.maxRadius);
      const height = rng.range(c.minHeight, c.maxHeight);
      quat.setFromAxisAngle(up, rng.range(0, Math.PI * 2));
      position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      scale.setScalar(rng.range(c.minScale, c.maxScale));
      matrix.compose(position, quat, scale);
      const slot = cursors[variant]++;
      for (const mesh of byVariant[variant]) mesh.setMatrixAt(slot, matrix);
    }

    for (const meshes of byVariant) {
      for (const mesh of meshes) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        this.meshes.push(mesh);
      }
    }
  }

  update(x: number, groundY: number, z: number, dt: number): void {
    for (const mesh of this.meshes) {
      mesh.position.set(x, groundY, z);
      mesh.rotation.y += dt * CONFIG.clouds.driftSpeed;
    }
  }

  /** Removes the cloud meshes (shared model geometry/materials are kept). */
  dispose(scene: THREE.Scene): void {
    for (const mesh of this.meshes) {
      scene.remove(mesh);
      mesh.dispose();
    }
    this.meshes.length = 0;
  }
}

/** A handful of overlapping spheres forms one puffy cloud (fallback asset). */
function proceduralCloud(): ModelAsset {
  const c = CONFIG.clouds;
  const puffs: Array<[number, number, number, number]> = [
    [0, 0, 0, 1],
    [1.05, 0.12, 0.15, 0.72],
    [-0.95, 0.06, -0.15, 0.68],
    [0.35, 0.42, -0.05, 0.6],
    [-0.35, 0.34, 0.18, 0.52],
  ];
  const parts = puffs.map(([x, y, z, radius]) => {
    const geometry = new THREE.SphereGeometry(radius, 7, 5);
    geometry.translate(x, y, z);
    return geometry;
  });
  const geometry = mergeGeometries(parts) ?? parts[0];
  const material = new THREE.MeshStandardMaterial({
    color: c.color,
    roughness: 1,
    flatShading: true,
    fog: false,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.5,
  });
  geometry.computeBoundingBox();
  const box = geometry.boundingBox as THREE.Box3;
  return {
    parts: [{ geometry, material }],
    radius: Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2,
    height: box.max.y - box.min.y,
  };
}
