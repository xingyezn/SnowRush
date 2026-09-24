import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { ModelAsset } from './ModelLibrary';
import { terrainHeight } from './TerrainHeight';
import { getCourseConfig } from './WorldConfig';

export interface RampPlacement {
  x: number;
  z: number;
}

const X_AXIS = new THREE.Vector3(1, 0, 0);

/**
 * Wedge-shaped kicker. Entry edge is at +Z (uphill), the lip at -Z, so a player
 * travelling downhill rides up the incline and launches.
 */
function buildWedge(width: number, length: number, height: number) {
  const hw = width / 2;
  const hl = length / 2;
  const positions = [
    -hw, 0, hl,
    hw, 0, hl,
    hw, 0, -hl,
    -hw, 0, -hl,
    -hw, height, -hl,
    hw, height, -hl,
  ];
  const indices = [0, 1, 5, 0, 5, 4, 2, 3, 4, 2, 4, 5, 0, 3, 2, 0, 2, 1, 0, 4, 3, 1, 2, 5];
  return { positions, indices };
}

/** Footprint (width/height/length in X/Y/Z) of a model asset. */
function footprint(asset: ModelAsset): { w: number; h: number; l: number } {
  const box = new THREE.Box3();
  for (const part of asset.parts) {
    part.geometry.computeBoundingBox();
    if (part.geometry.boundingBox) box.union(part.geometry.boundingBox);
  }
  const size = box.getSize(new THREE.Vector3());
  return { w: Math.max(size.x, 1e-4), h: Math.max(size.y, 1e-4), l: Math.max(size.z, 1e-4) };
}

/**
 * Jump kickers. The collider is always the reliable wedge (so the rider can
 * climb it); the owner's ramp model is drawn on top, stretched to the wedge's
 * width/length so the two line up. Falls back to the bare wedge if no model.
 */
export class JumpRampField {
  readonly placements: RampPlacement[];
  private readonly scene: THREE.Scene;
  private readonly fallbackGeometry: THREE.BufferGeometry | null;
  private readonly fallbackMaterial: THREE.Material | null;
  private readonly meshes: THREE.Object3D[] = [];
  private readonly body: RAPIER.RigidBody;

  constructor(
    physics: PhysicsWorld,
    scene: THREE.Scene,
    placements: RampPlacement[],
    models: ModelAsset[] = [],
  ) {
    this.placements = placements;
    this.scene = scene;
    const c = getCourseConfig().ramps;

    this.body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());

    const useModels = models.length > 0;
    const wedge = buildWedge(c.width, c.length, c.height);
    const wedgePoints = new Float32Array(wedge.positions);

    if (!useModels) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(wedge.positions, 3));
      geometry.setIndex(wedge.indices);
      geometry.computeVertexNormals();
      this.fallbackGeometry = geometry;
      this.fallbackMaterial = new THREE.MeshStandardMaterial({
        color: CONFIG.colors.ramp,
        roughness: 0.9,
        flatShading: true,
        side: THREE.DoubleSide,
      });
    } else {
      this.fallbackGeometry = null;
      this.fallbackMaterial = null;
    }

    const scales = models.map((model) => {
      const f = footprint(model);
      return new THREE.Vector3(c.width / f.w, c.height / f.h, c.length / f.l);
    });

    placements.forEach((p, index) => {
      const variant = useModels ? index % models.length : 0;
      const groundY = terrainHeight(p.x, p.z);
      const slope = (terrainHeight(p.x, p.z + 1) - terrainHeight(p.x, p.z - 1)) / 2;
      const quat = new THREE.Quaternion().setFromAxisAngle(X_AXIS, -Math.atan(slope));
      // Sink the ramp a little so its base merges with the snow.
      const y = groundY - 0.35;

      if (useModels) {
        for (const part of models[variant].parts) {
          const mesh = new THREE.Mesh(part.geometry, part.material);
          mesh.position.set(p.x, y, p.z);
          mesh.quaternion.copy(quat);
          mesh.scale.copy(scales[variant]);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          scene.add(mesh);
          this.meshes.push(mesh);
        }
      } else if (this.fallbackGeometry && this.fallbackMaterial) {
        const mesh = new THREE.Mesh(this.fallbackGeometry, this.fallbackMaterial);
        mesh.position.set(p.x, y, p.z);
        mesh.quaternion.copy(quat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        this.meshes.push(mesh);
      }

      const collider = RAPIER.ColliderDesc.convexHull(wedgePoints);
      if (!collider) return;
      collider
        .setTranslation(p.x, y, p.z)
        .setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w })
        .setFriction(0.05)
        .setRestitution(0)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      physics.createCollider(collider, this.body, { kind: 'ramp', index });
    });
  }

  dispose(physics: PhysicsWorld): void {
    physics.world.removeRigidBody(this.body);
    for (const mesh of this.meshes) this.scene.remove(mesh);
    this.meshes.length = 0;
    this.fallbackGeometry?.dispose();
    this.fallbackMaterial?.dispose();
  }
}
