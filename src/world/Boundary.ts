import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { courseCenterX, terrainHeight } from './TerrainHeight';

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Course boundary: a visible wooden fence plus invisible walls that follow the
 * meandering centre line so the player can see where the playable area ends.
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
    const quat = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    const railBottom = b.postHeight - b.railThickness * 0.5;
    const railTop = b.postHeight + b.railThickness * 0.5;
    let postIndex = 0;

    for (const side of [-1, 1]) {
      const positions: number[] = [];
      const indices: number[] = [];
      for (let i = 0; i <= segments; i++) {
        const z = -halfLength + (i / segments) * t.length;
        const x = courseCenterX(z) + side * halfPlay;
        const groundY = terrainHeight(x, z);
        positions.push(x, groundY + railBottom, z);
        positions.push(x, groundY + railTop, z);
        if (i < segments) {
          const a = i * 2;
          indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
        }
        matrix.compose(position.set(x, groundY, z), quat.identity(), one);
        posts.setMatrixAt(postIndex++, matrix);
      }

      const railGeo = new THREE.BufferGeometry();
      railGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      railGeo.setIndex(indices);
      railGeo.computeVertexNormals();
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.castShadow = true;
      scene.add(rail);

      // Coarse wall segments follow the curve (rotated to the local tangent).
      const wallSegments = Math.ceil(t.length / b.wallSpacing);
      const wallLength = t.length / wallSegments;
      for (let i = 0; i < wallSegments; i++) {
        const z0 = -halfLength + i * wallLength;
        const z1 = z0 + wallLength;
        const zm = (z0 + z1) / 2;
        const xm = courseCenterX(zm) + side * (halfPlay + t.wallThickness);
        const yaw = Math.atan2(courseCenterX(z1) - courseCenterX(z0), wallLength);
        quat.setFromAxisAngle(UP, yaw);
        const wall = RAPIER.ColliderDesc.cuboid(
          t.wallThickness,
          t.wallHalfHeight,
          wallLength / 2 + 1,
        )
          .setTranslation(xm, 0, zm)
          .setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w })
          .setFriction(0.2);
        physics.createCollider(wall, body);
      }
    }

    posts.instanceMatrix.needsUpdate = true;
    posts.computeBoundingSphere();

    // Wall behind the start so the player cannot slide off the uphill edge.
    const backZ = halfLength + t.wallThickness;
    const backBody = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(courseCenterX(backZ), 0, backZ),
    );
    physics.createCollider(
      RAPIER.ColliderDesc.cuboid(halfPlay, t.wallHalfHeight, t.wallThickness).setFriction(0.2),
      backBody,
    );
  }
}
