import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { buildHeightFieldData } from './HeightFieldData';
import { terrainHeight, terrainNormalComponents } from './TerrainHeight';
import { getTerrainConfig } from './WorldConfig';

/**
 * Procedural snow terrain.
 * The render mesh and the Rapier heightfield are generated from the same
 * height function (see TerrainHeight / HeightFieldData).
 */
export class Terrain {
  readonly mesh: THREE.Mesh;

  private readonly body: RAPIER.RigidBody;
  private readonly scene: THREE.Scene;
  private readonly material: THREE.MeshStandardMaterial;

  constructor(physics: PhysicsWorld, scene: THREE.Scene) {
    this.scene = scene;
    const t = getTerrainConfig();

    const geometry = new THREE.PlaneGeometry(t.width, t.length, t.segmentsX, t.segmentsZ);
    geometry.rotateX(-Math.PI / 2);

    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    // Steeper faces (valley walls, wave crests) are tinted toward rock/ice.
    const vertexColors = new Float32Array(position.count * 3);
    const snowColor = new THREE.Color(CONFIG.colors.snow);
    const steepColor = new THREE.Color(CONFIG.colors.snowSteep);
    const mixed = new THREE.Color();
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      position.setY(i, terrainHeight(x, z));

      const normal = terrainNormalComponents(x, z);
      const steep = 1 - THREE.MathUtils.smoothstep(normal.y, 0.5, 0.92);
      mixed.copy(snowColor).lerp(steepColor, steep);
      vertexColors[i * 3] = mixed.r;
      vertexColors[i * 3 + 1] = mixed.g;
      vertexColors[i * 3 + 2] = mixed.b;
    }
    position.needsUpdate = true;
    geometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0,
      flatShading: true,
    });
    this.material = material;

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

  /** Removes the mesh + collider so the terrain can be regenerated. */
  dispose(physics: PhysicsWorld): void {
    physics.world.removeRigidBody(this.body);
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
