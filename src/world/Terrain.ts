import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { buildHeightFieldData } from './HeightFieldData';
import { terrainHeight } from './TerrainHeight';

/**
 * Procedural snow terrain.
 * The render mesh and the Rapier heightfield are generated from the same
 * height function (see TerrainHeight / HeightFieldData).
 */
export class Terrain {
  readonly mesh: THREE.Mesh;

  private readonly body: RAPIER.RigidBody;

  constructor(physics: PhysicsWorld, scene: THREE.Scene) {
    const t = CONFIG.terrain;

    const geometry = new THREE.PlaneGeometry(t.width, t.length, t.segmentsX, t.segmentsZ);
    geometry.rotateX(-Math.PI / 2);

    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i++) {
      position.setY(i, terrainHeight(position.getX(i), position.getZ(i)));
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    const material = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.snow,
      roughness: 0.95,
      metalness: 0,
      flatShading: true,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'terrain';
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    this.body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    const data = buildHeightFieldData();
    const collider = RAPIER.ColliderDesc.heightfield(data.nrows, data.ncols, data.heights, data.scale)
      .setFriction(t.friction)
      .setRestitution(0);
    physics.createCollider(collider, this.body);
  }
}
