import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { terrainHeight } from './TerrainHeight';

export interface RockPlacement {
  x: number;
  z: number;
  scale: number;
  rotation: number;
}

const UP = new THREE.Vector3(0, 1, 0);

/** Low-poly rocks as a single InstancedMesh plus one ball collider each. */
export class RockField {
  readonly placements: RockPlacement[];

  constructor(physics: PhysicsWorld, scene: THREE.Scene, placements: RockPlacement[]) {
    this.placements = placements;
    const c = CONFIG.course.rocks;

    const geometry = new THREE.IcosahedronGeometry(c.radius, 0);
    const material = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.rock,
      roughness: 1,
      flatShading: true,
    });

    const count = placements.length;
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();

    placements.forEach((p, index) => {
      const groundY = terrainHeight(p.x, p.z);
      const colliderRadius = c.colliderRadius * p.scale;
      const centerY = groundY + colliderRadius * 0.75;

      quat.setFromAxisAngle(UP, p.rotation);
      position.set(p.x, centerY, p.z);
      scale.set(p.scale, p.scale * 0.8, p.scale * 1.1);
      matrix.compose(position, quat, scale);
      mesh.setMatrixAt(index, matrix);

      const collider = RAPIER.ColliderDesc.ball(colliderRadius)
        .setTranslation(p.x, centerY, p.z)
        .setFriction(0.3)
        .setRestitution(0)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      physics.createCollider(collider, body, { kind: 'rock', index });
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }
}
