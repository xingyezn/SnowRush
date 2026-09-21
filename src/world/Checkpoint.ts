import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { terrainHeight } from './TerrainHeight';

export interface CheckpointPlacement {
  x: number;
  z: number;
}

export interface Checkpoint extends CheckpointPlacement {
  reached: boolean;
}

/**
 * Checkpoint arch: updates the respawn point and records progress.
 * Visual poles do not block movement; a wide sensor triggers on crossing.
 */
export class CheckpointField {
  readonly checkpoints: Checkpoint[];

  constructor(physics: PhysicsWorld, scene: THREE.Scene, placements: CheckpointPlacement[]) {
    const c = CONFIG.course.checkpoints;
    const poleGeo = new THREE.CylinderGeometry(0.25, 0.25, c.height, 6);
    const barGeo = new THREE.BoxGeometry(c.width, 0.7, 0.4);
    const poleMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.checkpoint,
      roughness: 0.7,
      flatShading: true,
    });
    const barMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.checkpoint,
      roughness: 0.7,
      flatShading: true,
    });

    const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.checkpoints = placements.map((p) => ({ ...p, reached: false }));

    placements.forEach((p, index) => {
      const half = c.width / 2;
      const groundLeft = terrainHeight(p.x - half, p.z);
      const groundRight = terrainHeight(p.x + half, p.z);
      const groundCenter = terrainHeight(p.x, p.z);

      const group = new THREE.Group();
      for (const side of [-1, 1]) {
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(p.x + side * half, (side < 0 ? groundLeft : groundRight) + c.height / 2, p.z);
        pole.castShadow = true;
        group.add(pole);
      }
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(p.x, Math.max(groundLeft, groundRight, groundCenter) + c.height - 0.5, p.z);
      bar.castShadow = true;
      group.add(bar);
      scene.add(group);

      const sensor = RAPIER.ColliderDesc.cuboid(half, c.height / 2, c.sensorDepth / 2)
        .setTranslation(p.x, groundCenter + c.height / 2, p.z)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      physics.createCollider(sensor, body, { kind: 'checkpoint', index });
    });
  }
}
