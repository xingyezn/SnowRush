import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { ModelAsset } from './ModelLibrary';
import { courseCenterX, terrainHeight } from './TerrainHeight';
import { getCourseConfig, getTerrainConfig } from './WorldConfig';

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Course boundary: a visible fence plus invisible walls that follow the
 * meandering centre line so the player can see where the playable area ends.
 *
 * The fence uses the loaded guardrail models when available, tiled along both
 * sides; otherwise it falls back to the procedural post + rail fence. The
 * physics walls are always the same analytic segments.
 */
export class Boundary {
  private readonly scene: THREE.Scene;
  private readonly rendered: THREE.Object3D[] = [];
  /** Geometry/material owned by this class (procedural fallback only). */
  private readonly owned: Array<THREE.BufferGeometry | THREE.Material> = [];
  private readonly body: RAPIER.RigidBody;
  private readonly backBody: RAPIER.RigidBody;

  constructor(physics: PhysicsWorld, scene: THREE.Scene, fences: ModelAsset[] = []) {
    this.scene = scene;
    const t = getTerrainConfig();
    const b = getCourseConfig().boundary;
    const halfPlay = t.playWidth / 2;
    const halfLength = t.length / 2;

    const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.body = body;

    if (fences.length > 0) buildModelFence(this, scene, fences, t, halfPlay, halfLength);
    else buildProceduralFence(this, scene, b, halfPlay, halfLength);

    // Coarse physics wall segments follow the curve (rotated to the local tangent).
    const wallSegments = Math.ceil(t.length / b.wallSpacing);
    const wallLength = t.length / wallSegments;
    const quat = new THREE.Quaternion();
    for (const side of [-1, 1]) {
      for (let i = 0; i < wallSegments; i++) {
        const z0 = -halfLength + i * wallLength;
        const z1 = z0 + wallLength;
        const zm = (z0 + z1) / 2;
        const xm = courseCenterX(zm) + side * (halfPlay + t.wallThickness);
        const yaw = Math.atan2(courseCenterX(z1) - courseCenterX(z0), wallLength);
        quat.setFromAxisAngle(UP, yaw);
        const wall = RAPIER.ColliderDesc.cuboid(t.wallThickness, t.wallHalfHeight, wallLength / 2 + 1)
          .setTranslation(xm, 0, zm)
          .setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w })
          .setFriction(0.2);
        physics.createCollider(wall, body);
      }
    }

    // Wall behind the start so the player cannot slide off the uphill edge.
    const backZ = halfLength + t.wallThickness;
    const backBody = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(courseCenterX(backZ), 0, backZ),
    );
    this.backBody = backBody;
    physics.createCollider(
      RAPIER.ColliderDesc.cuboid(halfPlay, t.wallHalfHeight, t.wallThickness).setFriction(0.2),
      backBody,
    );
  }

  /** @internal registers a rendered object (and owned resources) for dispose. */
  track(object: THREE.Object3D, owned?: Array<THREE.BufferGeometry | THREE.Material>): void {
    this.rendered.push(object);
    if (owned) this.owned.push(...owned);
  }

  dispose(physics: PhysicsWorld): void {
    physics.world.removeRigidBody(this.body);
    physics.world.removeRigidBody(this.backBody);
    for (const object of this.rendered) this.scene.remove(object);
    for (const resource of this.owned) resource.dispose();
    this.rendered.length = 0;
    this.owned.length = 0;
  }
}

/** Tiles the loaded guardrail models along both sides of the course. */
function buildModelFence(
  boundary: Boundary,
  scene: THREE.Scene,
  fences: ModelAsset[],
  t: ReturnType<typeof getTerrainConfig>,
  halfPlay: number,
  halfLength: number,
): void {
  const spacing = Math.max(1.5, fences[0].radius * 1.9);
  const segments = Math.max(1, Math.ceil(t.length / spacing));

  const placements: Array<{ x: number; y: number; z: number; quat: THREE.Quaternion }> = [];
  const normal = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  const basis = new THREE.Matrix4();
  const eps = 1.5;
  for (const side of [-1, 1]) {
    for (let i = 0; i <= segments; i++) {
      const z = -halfLength + (i / segments) * t.length;
      const x = courseCenterX(z) + side * halfPlay;
      const dx = courseCenterX(z + 1) - courseCenterX(z);
      // Tilt the fence to the local ground so it follows the slope instead of
      // stabbing into it: up = terrain normal, length = path tangent.
      normal
        .set(
          terrainHeight(x - eps, z) - terrainHeight(x + eps, z),
          2 * eps,
          terrainHeight(x, z - eps) - terrainHeight(x, z + eps),
        )
        .normalize();
      tangent.set(dx, 0, 1).normalize();
      tangent.addScaledVector(normal, -tangent.dot(normal));
      if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0);
      tangent.normalize();
      binormal.crossVectors(tangent, normal).normalize();
      const quat = new THREE.Quaternion().setFromRotationMatrix(
        basis.makeBasis(tangent, normal, binormal),
      );
      placements.push({ x, y: terrainHeight(x, z), z, quat });
    }
  }

  const variantOf = placements.map((_, index) => index % fences.length);
  const counts = fences.map(() => 0);
  for (const variant of variantOf) counts[variant]++;

  const meshes = fences.map((asset, variant) => {
    if (counts[variant] === 0) return [];
    return asset.parts.map((part) => {
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, counts[variant]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    });
  });

  const cursors = fences.map(() => 0);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  placements.forEach((placement, index) => {
    const variant = variantOf[index];
    const slot = cursors[variant]++;
    position.set(placement.x, placement.y, placement.z);
    matrix.compose(position, placement.quat, one);
    for (const mesh of meshes[variant]) mesh.setMatrixAt(slot, matrix);
  });

  for (const parts of meshes) {
    for (const mesh of parts) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      boundary.track(mesh);
    }
  }
}

/** The original wooden post + rail fence, used when no models are loaded. */
function buildProceduralFence(
  boundary: Boundary,
  scene: THREE.Scene,
  b: ReturnType<typeof getCourseConfig>['boundary'],
  halfPlay: number,
  halfLength: number,
): void {
  const t = getTerrainConfig();
  const segments = Math.ceil(t.length / b.postSpacing);

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
  boundary.track(posts, [postGeo, postMat, railMat]);

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
    boundary.track(rail, [railGeo]);
  }

  posts.instanceMatrix.needsUpdate = true;
  posts.computeBoundingSphere();
}
