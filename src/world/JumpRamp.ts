import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { terrainHeight } from './TerrainHeight';

export interface RampPlacement {
  x: number;
  z: number;
}

const X_AXIS = new THREE.Vector3(1, 0, 0);

/**
 * Wedge-shaped kicker. Entry edge is at +Z (uphill), the lip at -Z, so a player
 * travelling downhill rides up the incline and launches.
 */
function buildWedge(width: number, length: number, height: number) {
  const hw = width / 2;
  const hl = length / 2;
  const positions = [
    -hw, 0, hl, // 0 entry left
    hw, 0, hl, // 1 entry right
    hw, 0, -hl, // 2 bottom lip right
    -hw, 0, -hl, // 3 bottom lip left
    -hw, height, -hl, // 4 top lip left
    hw, height, -hl, // 5 top lip right
  ];
  const indices = [
    0, 1, 5, 0, 5, 4, // incline
    2, 3, 4, 2, 4, 5, // lip face
    0, 3, 2, 0, 2, 1, // bottom
    0, 4, 3, // left side
    1, 2, 5, // right side
  ];
  return { positions, indices };
}

export class JumpRampField {
  readonly placements: RampPlacement[];

  constructor(physics: PhysicsWorld, scene: THREE.Scene, placements: RampPlacement[]) {
    this.placements = placements;
    const c = CONFIG.course.ramps;
    const { positions, indices } = buildWedge(c.width, c.length, c.height);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.ramp,
      roughness: 0.9,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    const hullPoints = new Float32Array(positions);
    const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());

    placements.forEach((p, index) => {
      const groundY = terrainHeight(p.x, p.z);
      const slope = (terrainHeight(p.x, p.z + 1) - terrainHeight(p.x, p.z - 1)) / 2;
      const quat = new THREE.Quaternion().setFromAxisAngle(X_AXIS, -Math.atan(slope));
      const y = groundY - 0.3;

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(p.x, y, p.z);
      mesh.quaternion.copy(quat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const collider = RAPIER.ColliderDesc.convexHull(hullPoints);
      if (!collider) return;
      collider
        .setTranslation(p.x, y, p.z)
        .setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w })
        .setFriction(0.05)
        .setRestitution(0)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      physics.createCollider(collider, body, { kind: 'ramp', index });
    });
  }
}
