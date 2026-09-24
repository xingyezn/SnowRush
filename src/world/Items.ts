import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { terrainHeight } from './TerrainHeight';

export type ItemType = 'boost' | 'score' | 'shield' | 'magnet' | 'slowmo' | 'invincible';

export const ITEM_TYPES: ItemType[] = [
  'boost',
  'score',
  'shield',
  'magnet',
  'slowmo',
  'invincible',
];

const ITEM_COLORS: Record<ItemType, number> = {
  boost: CONFIG.colors.itemBoost,
  score: CONFIG.colors.itemScore,
  shield: CONFIG.colors.itemShield,
  magnet: CONFIG.colors.itemMagnet,
  slowmo: CONFIG.colors.itemSlowmo,
  invincible: CONFIG.colors.itemInvincible,
};

export function itemColor(type: ItemType): number {
  return ITEM_COLORS[type];
}

export interface ItemPlacement {
  x: number;
  z: number;
  type: ItemType;
}

export interface Item extends ItemPlacement {
  y: number;
  active: boolean;
}

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Floating collectibles: one instanced mesh (per-instance colour) plus ball
 * sensors. They bob and spin; collecting hides the instance.
 */
export class ItemField {
  readonly items: Item[];
  private readonly scene: THREE.Scene;
  private readonly mesh: THREE.InstancedMesh;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.Material;
  private readonly body: RAPIER.RigidBody;
  private time = 0;

  private readonly matrix = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly position = new THREE.Vector3();
  private readonly scale = new THREE.Vector3(1, 1, 1);
  private readonly zero = new THREE.Vector3(0, 0, 0);

  constructor(physics: PhysicsWorld, scene: THREE.Scene, placements: ItemPlacement[]) {
    this.scene = scene;
    const cfg = CONFIG.items;
    const count = placements.length;

    const geometry = new THREE.IcosahedronGeometry(cfg.radius, 0);
    this.geometry = geometry;
    const material = new THREE.MeshStandardMaterial({
      roughness: 0.35,
      metalness: 0.1,
      flatShading: true,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.25,
    });
    this.material = material;

    const mesh = new THREE.InstancedMesh(geometry, material, Math.max(count, 1));
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    scene.add(mesh);
    this.mesh = mesh;

    this.body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());

    this.items = placements.map((p, index) => {
      const y = terrainHeight(p.x, p.z) + cfg.spawnHeight;
      this.matrix.compose(this.position.set(p.x, y, p.z), this.quat.identity(), this.zero);
      mesh.setMatrixAt(index, this.matrix);
      mesh.setColorAt(index, new THREE.Color(ITEM_COLORS[p.type]));
      const sensor = RAPIER.ColliderDesc.ball(cfg.sensorRadius)
        .setTranslation(p.x, y, p.z)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      physics.createCollider(sensor, this.body, { kind: 'item', index });
      return { ...p, y, active: true };
    });

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }

  update(dt: number): void {
    this.time += dt;
    const cfg = CONFIG.items;
    (this.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.28 + 0.22 * Math.sin(this.time * 4);
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (!item.active) continue;
      const bob = Math.sin(this.time * 2 + i) * cfg.bob;
      this.quat.setFromAxisAngle(UP, this.time * cfg.spin + i);
      this.matrix.compose(this.position.set(item.x, item.y + bob, item.z), this.quat, this.scale);
      this.mesh.setMatrixAt(i, this.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Re-activates every collectible (new run). */
  reset(): void {
    this.time = 0;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      item.active = true;
      this.matrix.compose(
        this.position.set(item.x, item.y, item.z),
        this.quat.identity(),
        this.scale,
      );
      this.mesh.setMatrixAt(i, this.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  deactivate(index: number): void {
    if (index < 0 || index >= this.items.length) return;
    this.items[index].active = false;
    this.matrix.compose(this.zero, this.quat.identity(), this.zero);
    this.mesh.setMatrixAt(index, this.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  distanceTo(index: number, target: THREE.Vector3): number {
    const item = this.items[index];
    if (!item) return Infinity;
    const dx = item.x - target.x;
    const dy = item.y - target.y;
    const dz = item.z - target.z;
    return Math.hypot(dx, dy, dz);
  }

  dispose(physics: PhysicsWorld): void {
    physics.world.removeRigidBody(this.body);
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
