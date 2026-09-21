import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { terrainHeight } from './TerrainHeight';

export interface FinishPlacement {
  x: number;
  z: number;
}

/** Finish line: a wide banner with a sensor that ends the run. */
export class FinishArea {
  readonly placement: FinishPlacement;

  constructor(physics: PhysicsWorld, scene: THREE.Scene, placement: FinishPlacement) {
    this.placement = placement;
    const c = CONFIG.course.finish;
    const half = c.width / 2;

    const poleGeo = new THREE.CylinderGeometry(0.3, 0.3, c.height, 6);
    const bannerGeo = new THREE.BoxGeometry(c.width, 1.6, 0.4);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, flatShading: true });
    const bannerMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.finish,
      roughness: 0.7,
      flatShading: true,
    });

    const groundLeft = terrainHeight(placement.x - half, placement.z);
    const groundRight = terrainHeight(placement.x + half, placement.z);
    const groundCenter = terrainHeight(placement.x, placement.z);

    const group = new THREE.Group();
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(
        placement.x + side * half,
        (side < 0 ? groundLeft : groundRight) + c.height / 2,
        placement.z,
      );
      pole.castShadow = true;
      group.add(pole);
    }
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(
      placement.x,
      Math.max(groundLeft, groundRight, groundCenter) + c.height - 1.1,
      placement.z,
    );
    banner.castShadow = true;
    group.add(banner);
    scene.add(group);

    const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    const sensor = RAPIER.ColliderDesc.cuboid(half, c.height / 2, c.sensorDepth / 2)
      .setTranslation(placement.x, groundCenter + c.height / 2, placement.z)
      .setSensor(true)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    physics.createCollider(sensor, body, { kind: 'finish', index: 0 });
  }
}
