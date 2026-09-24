import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import { Rng } from '../core/Rng';
import type { ModelAsset } from './ModelLibrary';

interface Balloon {
  group: THREE.Group;
  offset: THREE.Vector3;
  dir: THREE.Vector2;
  speed: number;
}

/**
 * Hot-air balloons drifting across the course. They circle the rider at varied
 * distances and heights and wrap around when they drift out of range, so one
 * regularly crosses the view. No physics, no shadows.
 */
export class Balloons {
  private readonly meshes: THREE.Object3D[] = [];
  private readonly items: Balloon[] = [];

  constructor(scene: THREE.Scene, models: ModelAsset[]) {
    if (models.length === 0) return;
    const c = CONFIG.balloons;
    const rng = new Rng(CONFIG.course.seed ^ 0x2a7b1d);

    for (let i = 0; i < c.count; i++) {
      const asset = models[i % models.length];
      const group = new THREE.Group();
      for (const part of asset.parts) {
        const mesh = new THREE.Mesh(part.geometry, part.material);
        mesh.castShadow = false;
        mesh.frustumCulled = false;
        group.add(mesh);
      }
      group.scale.setScalar(rng.range(c.minScale, c.maxScale));
      scene.add(group);
      this.meshes.push(group);

      const angle = rng.range(0, Math.PI * 2);
      const radius = rng.range(c.minRadius, c.maxRadius);
      const offset = new THREE.Vector3(
        Math.cos(angle) * radius,
        rng.range(c.minHeight, c.maxHeight),
        Math.sin(angle) * radius,
      );
      // Drift tangentially so they cross the rider's view.
      const dir = new THREE.Vector2(Math.cos(angle + Math.PI / 2), Math.sin(angle + Math.PI / 2));
      this.items.push({ group, offset, dir, speed: c.speed * rng.range(0.7, 1.3) });
    }
  }

  update(x: number, groundY: number, z: number, dt: number): void {
    const c = CONFIG.balloons;
    for (const item of this.items) {
      item.offset.x += item.dir.x * item.speed * dt;
      item.offset.z += item.dir.y * item.speed * dt;
      const radius = Math.hypot(item.offset.x, item.offset.z);
      if (radius > c.maxRadius) {
        // Wrap to the opposite side at a fresh height so it keeps flying past.
        const k = c.minRadius / radius;
        item.offset.x *= -k;
        item.offset.z *= -k;
        item.offset.y = c.minHeight + (c.maxHeight - c.minHeight) * Math.random();
      }
      item.group.position.set(x + item.offset.x, groundY + item.offset.y, z + item.offset.z);
      item.group.rotation.y += dt * 0.15;
    }
  }

  dispose(scene: THREE.Scene): void {
    for (const mesh of this.meshes) scene.remove(mesh);
    this.meshes.length = 0;
    this.items.length = 0;
  }
}
