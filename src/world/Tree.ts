import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { terrainHeight } from './TerrainHeight';

export interface TreePlacement {
  x: number;
  z: number;
  scale: number;
  rotation: number;
}

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Low-poly pine trees rendered with three InstancedMeshes (3 draw calls total)
 * plus one static cylinder collider per tree.
 */
export class TreeField {
  readonly placements: TreePlacement[];

  constructor(physics: PhysicsWorld, scene: THREE.Scene, placements: TreePlacement[]) {
    this.placements = placements;
    const c = CONFIG.course.trees;
    const colors = CONFIG.colors;

    const trunkGeo = new THREE.CylinderGeometry(c.trunkRadius * 0.7, c.trunkRadius, c.trunkHeight, 6);
    trunkGeo.translate(0, c.trunkHeight / 2, 0);

    const lowerGeo = new THREE.ConeGeometry(c.foliageRadius, c.foliageHeight, 7);
    lowerGeo.translate(0, c.trunkHeight * 0.55 + c.foliageHeight / 2, 0);

    const upperGeo = new THREE.ConeGeometry(c.foliageRadius * 0.68, c.foliageHeight * 0.8, 7);
    upperGeo.translate(0, c.trunkHeight * 0.55 + c.foliageHeight * 0.55 + c.foliageHeight * 0.4, 0);

    const trunkMat = new THREE.MeshStandardMaterial({
      color: colors.treeTrunk,
      roughness: 0.95,
      flatShading: true,
    });
    const foliageMat = new THREE.MeshStandardMaterial({
      color: colors.treeFoliage,
      roughness: 0.9,
      flatShading: true,
    });

    const count = placements.length;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const lower = new THREE.InstancedMesh(lowerGeo, foliageMat, count);
    const upper = new THREE.InstancedMesh(upperGeo, foliageMat, count);
    for (const mesh of [trunks, lower, upper]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }

    const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();

    placements.forEach((p, index) => {
      const groundY = terrainHeight(p.x, p.z);
      quat.setFromAxisAngle(UP, p.rotation);
      position.set(p.x, groundY, p.z);
      scale.setScalar(p.scale);
      matrix.compose(position, quat, scale);
      trunks.setMatrixAt(index, matrix);
      lower.setMatrixAt(index, matrix);
      upper.setMatrixAt(index, matrix);

      const collider = RAPIER.ColliderDesc.cylinder(
        (c.colliderHeight / 2) * p.scale,
        c.colliderRadius * p.scale,
      )
        .setTranslation(p.x, groundY + (c.colliderHeight / 2) * p.scale, p.z)
        .setFriction(0.2)
        .setRestitution(0)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      physics.createCollider(collider, body, { kind: 'tree', index });
    });

    for (const mesh of [trunks, lower, upper]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }
}
