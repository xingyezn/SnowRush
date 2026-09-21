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

/**
 * Slalom gate: two poles and a banner (visual only) plus a sensor volume that
 * scores the player when they pass through. Poles do not block movement.
 */
export class GateField {
  readonly gates: Gate[];

  constructor(physics: PhysicsWorld, scene: THREE.Scene, placements: GatePlacement[]) {
    const c = CONFIG.course.gates;
    const poleGeo = new THREE.CylinderGeometry(c.poleRadius, c.poleRadius, c.height, 6);
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

    const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.gates = placements.map((p) => ({ ...p, passed: false }));

    placements.forEach((p, index) => {
      const half = c.width / 2;
      const groundLeft = terrainHeight(p.x - half, p.z);
      const groundRight = terrainHeight(p.x + half, p.z);
      const groundCenter = terrainHeight(p.x, p.z);
      const bannerY = Math.max(groundLeft, groundRight, groundCenter) + c.height - 0.4;

      const group = new THREE.Group();
      for (const side of [-1, 1]) {
        const pole = new THREE.Mesh(poleGeo, poleMat);
        const groundY = side < 0 ? groundLeft : groundRight;
        pole.position.set(p.x + side * half, groundY + c.height / 2, p.z);
        pole.castShadow = true;
        group.add(pole);
      }
      const banner = new THREE.Mesh(bannerGeo, bannerMat);
      banner.position.set(p.x, bannerY, p.z);
      banner.castShadow = true;
      group.add(banner);
      scene.add(group);

      const sensor = RAPIER.ColliderDesc.cuboid(half, c.height / 2, c.sensorDepth / 2)
        .setTranslation(p.x, groundCenter + c.height / 2, p.z)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      physics.createCollider(sensor, body, { kind: 'gate', index });
    });
  }
}
