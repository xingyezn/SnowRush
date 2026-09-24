import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { terrainHeight } from './TerrainHeight';
import { getCourseConfig } from './WorldConfig';

export interface CheckpointPlacement {
  x: number;
  z: number;
}

export interface Checkpoint extends CheckpointPlacement {
  reached: boolean;
}

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Checkpoint arch (instanced poles + bar) that updates the respawn point.
 * A wide sensor triggers on crossing; the arch does not block movement.
 */
export class CheckpointField {
  readonly checkpoints: Checkpoint[];
  private readonly scene: THREE.Scene;
  private readonly poles: THREE.InstancedMesh;
  private readonly bars: THREE.InstancedMesh;
  private readonly poleGeo: THREE.BufferGeometry;
  private readonly barGeo: THREE.BufferGeometry;
  private readonly material: THREE.Material;
  private readonly body: RAPIER.RigidBody;

  constructor(physics: PhysicsWorld, scene: THREE.Scene, placements: CheckpointPlacement[]) {
    this.scene = scene;
    const c = getCourseConfig().checkpoints;
    const count = placements.length;

    const poleGeo = new THREE.CylinderGeometry(0.25, 0.25, c.height, 6);
    poleGeo.translate(0, c.height / 2, 0);
    this.poleGeo = poleGeo;
    const barGeo = new THREE.BoxGeometry(c.width, 0.7, 0.4);
    this.barGeo = barGeo;

    const material = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.checkpoint,
      roughness: 0.7,
      flatShading: true,
    });
    this.material = material;

    const poles = new THREE.InstancedMesh(poleGeo, material, count * 2);
    const bars = new THREE.InstancedMesh(barGeo, material, count);
    poles.castShadow = true;
    bars.castShadow = true;
    scene.add(poles);
    scene.add(bars);
    this.poles = poles;
    this.bars = bars;

    const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.body = body;
    this.checkpoints = placements.map((p) => ({ ...p, reached: false }));

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
      const topY = Math.max(groundLeft, groundRight, groundCenter) + c.height;
      const barY = topY - 0.5;

      quat.setFromAxisAngle(UP, 0);
      for (const side of [-1, 1]) {
        const groundY = side < 0 ? groundLeft : groundRight;
        const scaleY = Math.max((topY - groundY) / c.height, 0.2);
        position.set(p.x + side * half, groundY, p.z);
        poleScale.set(1, scaleY, 1);
        matrix.compose(position, quat, poleScale);
        poles.setMatrixAt(index * 2 + (side < 0 ? 0 : 1), matrix);
      }

      position.set(p.x, barY, p.z);
      matrix.compose(position, quat, one);
      bars.setMatrixAt(index, matrix);

      const sensor = RAPIER.ColliderDesc.cuboid(half, c.height / 2, c.sensorDepth / 2)
        .setTranslation(p.x, groundCenter + c.height / 2, p.z)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      physics.createCollider(sensor, body, { kind: 'checkpoint', index });
    });

    poles.instanceMatrix.needsUpdate = true;
    bars.instanceMatrix.needsUpdate = true;
    poles.computeBoundingSphere();
    bars.computeBoundingSphere();
  }

  dispose(physics: PhysicsWorld): void {
    physics.world.removeRigidBody(this.body);
    this.scene.remove(this.poles);
    this.scene.remove(this.bars);
    this.poleGeo.dispose();
    this.barGeo.dispose();
    this.material.dispose();
  }
}
