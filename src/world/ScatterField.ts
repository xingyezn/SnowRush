import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import type { ColliderKind, PhysicsWorld } from '../physics/PhysicsWorld';
import type { ModelAsset } from './ModelLibrary';
import { terrainHeight } from './TerrainHeight';

export interface ScatterPlacement {
  x: number;
  z: number;
  scale: number;
  rotation: number;
}

export interface ScatterCollider {
  kind: ColliderKind;
  shape: 'cylinder' | 'ball';
  radius: number;
  height?: number;
  offsetY?: number;
}

export interface ScatterOptions {
  physics: PhysicsWorld;
  scene: THREE.Scene;
  placements: ScatterPlacement[];
  models: ModelAsset[];
  collider?: ScatterCollider;
  /** Decorative fields can skip the shadow pass to save GPU time. Default true. */
  castShadow?: boolean;
}

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Places a set of models across the terrain with InstancedMesh (one draw call
 * per model part per variant) and optional static colliders.
 */
export class ScatterField {
  readonly placements: ScatterPlacement[];

  constructor(options: ScatterOptions) {
    const { physics, scene, placements, models, collider } = options;
    const castShadow = options.castShadow ?? true;
    this.placements = placements;
    if (placements.length === 0 || models.length === 0) return;

    const variantOf = placements.map((_, index) => index % models.length);
    const counts = models.map(() => 0);
    for (const variant of variantOf) counts[variant]++;

    const meshes: THREE.InstancedMesh[][] = models.map((asset, variant) => {
      if (counts[variant] === 0) return [];
      return asset.parts.map((part) => {
        const mesh = new THREE.InstancedMesh(part.geometry, part.material, counts[variant]);
        mesh.castShadow = castShadow;
        mesh.receiveShadow = true;
        scene.add(mesh);
        return mesh;
      });
    });

    const cursors = models.map(() => 0);
    const body = collider ? physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed()) : null;

    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();

    placements.forEach((placement, index) => {
      const variant = variantOf[index];
      const slot = cursors[variant]++;
      const groundY = terrainHeight(placement.x, placement.z);

      quat.setFromAxisAngle(UP, placement.rotation);
      position.set(placement.x, groundY, placement.z);
      scale.setScalar(placement.scale);
      matrix.compose(position, quat, scale);
      for (const mesh of meshes[variant]) mesh.setMatrixAt(slot, matrix);

      if (collider && body) {
        const radius = collider.radius * placement.scale;
        const height = (collider.height ?? collider.radius * 2) * placement.scale;
        const offset = (collider.offsetY ?? height / 2) * placement.scale;
        const desc =
          collider.shape === 'cylinder'
            ? RAPIER.ColliderDesc.cylinder(height / 2, radius)
            : RAPIER.ColliderDesc.ball(radius);
        desc
          .setTranslation(placement.x, groundY + offset, placement.z)
          .setFriction(0.2)
          .setRestitution(0)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
        physics.createCollider(desc, body, { kind: collider.kind, index });
      }
    });

    for (const parts of meshes) {
      for (const mesh of parts) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    }
  }
}
