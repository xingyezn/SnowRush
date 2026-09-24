import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { terrainHeight } from './TerrainHeight';
import { getCourseConfig } from './WorldConfig';

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
  private readonly scene: THREE.Scene;
  private readonly poles: THREE.InstancedMesh;
  private readonly banners: THREE.InstancedMesh;
  private readonly poleGeo: THREE.BufferGeometry;
  private readonly bannerGeo: THREE.BufferGeometry;
  private readonly poleMat: THREE.Material;
  private readonly bannerMat: THREE.Material;
  private readonly body: RAPIER.RigidBody;

  constructor(physics: PhysicsWorld, scene: THREE.Scene, placements: GatePlacement[]) {
    this.scene = scene;
    const c = getCourseConfig().gates;
    const count = placements.length;

    const poleGeo = new THREE.CylinderGeometry(c.poleRadius, c.poleRadius, c.height, 6);
    poleGeo.translate(0, c.height / 2, 0);
    this.poleGeo = poleGeo;
    const bannerGeo = new THREE.BoxGeometry(c.width, 0.6, 0.3);
    this.bannerGeo = bannerGeo;

    const poleMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.gatePole,
      roughness: 0.7,
      flatShading: true,
    });
    this.poleMat = poleMat;
    const bannerMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.gate,
      roughness: 0.7,
      flatShading: true,
    });
    this.bannerMat = bannerMat;

    const poles = new THREE.InstancedMesh(poleGeo, poleMat, count * 2);
    const banners = new THREE.InstancedMesh(bannerGeo, bannerMat, count);
    poles.castShadow = true;
    banners.castShadow = true;
    scene.add(poles);
    scene.add(banners);
    this.poles = poles;
    this.banners = banners;

    const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.body = body;
    this.gates = placements.map((p) => ({ ...p, passed: false }));

    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    const poleScale = new THREE.Vector3(1, 1, 1);

    placements.forEach((p, index) => {
      const half = c.width / 2;
      const groundLeft = terrainHeight(p.x - half, p.z);
      const groundRight = terrainHeight(p.x + half, p.z);
      const groundCenter = terrainHeight(p.x, p.z);
      // Both poles are stretched up to the same top so the banner always meets
      // them (otherwise sloped ground leaves a gap on the lower side).
      const topY = Math.max(groundLeft, groundRight, groundCenter) + c.height;
      const bannerY = topY - 0.4;

      quat.setFromAxisAngle(UP, 0);
      for (const side of [-1, 1]) {
        const groundY = side < 0 ? groundLeft : groundRight;
        const scaleY = Math.max((topY - groundY) / c.height, 0.2);
        position.set(p.x + side * half, groundY, p.z);
        poleScale.set(1, scaleY, 1);
        matrix.compose(position, quat, poleScale);
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

  dispose(physics: PhysicsWorld): void {
    physics.world.removeRigidBody(this.body);
    this.scene.remove(this.poles);
    this.scene.remove(this.banners);
    this.poleGeo.dispose();
    this.bannerGeo.dispose();
    this.poleMat.dispose();
    this.bannerMat.dispose();
  }
}
