import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { terrainHeight } from './TerrainHeight';

/**
 * Course boundary: invisible physics walls plus a visible wooden fence so the
 * player can see where the playable area ends. The fence follows the terrain.
 */
export class Boundary {
  constructor(physics: PhysicsWorld, scene: THREE.Scene) {
    const t = CONFIG.terrain;
    const b = CONFIG.course.boundary;
    const halfPlay = t.playWidth / 2;
    const halfLength = t.length / 2;
    const segments = Math.ceil(t.length / b.postSpacing);

    const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());

    const postGeo = new THREE.CylinderGeometry(b.postRadius, b.postRadius, b.postHeight, 5);
    postGeo.translate(0, b.postHeight / 2, 0);
    const postMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.boundaryPost,
      roughness: 0.9,
      flatShading: true,
    });
    const railMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.boundaryRail,
      roughness: 0.8,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    const posts = new THREE.InstancedMesh(postGeo, postMat, (segments + 1) * 2);
    posts.castShadow = true;
    posts.receiveShadow = true;
    scene.add(posts);

    const matrix = new THREE.Matrix4();
    const railBottom = b.postHeight - b.railThickness * 0.5;
    const railTop = b.postHeight + b.railThickness * 0.5;
    let postIndex = 0;

    for (const side of [-1, 1]) {
      const x = side * halfPlay;

      const wall = RAPIER.ColliderDesc.cuboid(t.wallThickness, t.wallHalfHeight, halfLength)
        .setTranslation(side * (halfPlay + t.wallThickness), 0, 0)
        .setFriction(0.2);
      physics.createCollider(wall, body);

      const positions: number[] = [];
      const indices: number[] = [];
      for (let i = 0; i <= segments; i++) {
        const z = -halfLength + (i / segments) * t.length;
        const groundY = terrainHeight(x, z);
        positions.push(x, groundY + railBottom, z);
        positions.push(x, groundY + railTop, z);
        if (i < segments) {
          const a = i * 2;
          indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
        }
        matrix.makeTranslation(x, groundY, z);
        posts.setMatrixAt(postIndex++, matrix);
      }

      const railGeo = new THREE.BufferGeometry();
      railGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      railGeo.setIndex(indices);
      railGeo.computeVertexNormals();
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.castShadow = true;
      scene.add(rail);
    }

    posts.instanceMatrix.needsUpdate = true;
    posts.computeBoundingSphere();

    // Wall behind the start so the player cannot slide off the uphill edge.
    const backBody = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, halfLength + t.wallThickness),
    );
    physics.createCollider(
      RAPIER.ColliderDesc.cuboid(halfPlay, t.wallHalfHeight, t.wallThickness).setFriction(0.2),
      backBody,
    );
  }
}
