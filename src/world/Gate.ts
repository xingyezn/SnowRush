import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { terrainHeight } from './TerrainHeight';

export interface GatePlacement {
  x: number;
  z: number;
}

export interface Gate extends GatePlacement {
  passed: boolean;
}

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Slalom gate: two poles and a banner (visual only, instanced) plus a sensor
 * volume that scores the player when they pass through. Poles do not block.
 */
export class GateField {
  readonly gates: Gate[];

  constructor(physics: PhysicsWorld, scene: THREE.Scene, placements: GatePlacement[]) {
    const c = CONFIG.course.gates;
    const count = placements.length;

    const poleGeo = new THREE.CylinderGeometry(c.poleRadius, c.poleRadius, c.height, 6);
    poleGeo.translate(0, c.height / 2, 0);
    const bannerGeo = new THREE.BoxGeometry(c.width, 0.6, 0.3);

    const poleMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.gatePole,
      roughness: 0.7,
      flatShading: true,
    });
    const bannerMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.gate,
      roughness: 0.7,
      flatShading: true,
    });

    const poles = new THREE.InstancedMesh(poleGeo, poleMat, count * 2);
    const banners = new THREE.InstancedMesh(bannerGeo, bannerMat, count);
    poles.castShadow = true;
    banners.castShadow = true;
    scene.add(poles);
    scene.add(banners);

    const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.gates = placements.map((p) => ({ ...p, passed: false }));

    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);

    placements.forEach((p, index) => {
      const half = c.width / 2;
      const groundLeft = terrainHeight(p.x - half, p.z);
      const groundRight = terrainHeight(p.x + half, p.z);
      const groundCenter = terrainHeight(p.x, p.z);
      const bannerY = Math.max(groundLeft, groundRight, groundCenter) + c.height - 0.4;

      quat.setFromAxisAngle(UP, 0);
      for (const side of [-1, 1]) {
        const groundY = side < 0 ? groundLeft : groundRight;
        position.set(p.x + side * half, groundY, p.z);
        matrix.compose(position, quat, one);
        poles.setMatrixAt(index * 2 + (side < 0 ? 0 : 1), matrix);
      }

      position.set(p.x, bannerY, p.z);
      matrix.compose(position, quat, one);
      banners.setMatrixAt(index, matrix);

      const sensor = RAPIER.ColliderDesc.cuboid(half, c.height / 2, c.sensorDepth / 2)
        .setTranslation(p.x, groundCenter + c.height / 2, p.z)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      physics.createCollider(sensor, body, { kind: 'gate', index });
    });

    poles.instanceMatrix.needsUpdate = true;
    banners.instanceMatrix.needsUpdate = true;
    poles.computeBoundingSphere();
    banners.computeBoundingSphere();
  }
}
