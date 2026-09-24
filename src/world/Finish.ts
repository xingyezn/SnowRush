import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { ModelAsset } from './ModelLibrary';
import { terrainHeight } from './TerrainHeight';
import { getCourseConfig, getTerrainConfig } from './WorldConfig';

export interface FinishPlacement {
  x: number;
  z: number;
}

/**
 * Finish line. When the arch model is available it is placed across the course
 * (scaled to `finish.height`); invisible walls fill the rest of the corridor so
 * the rider *must* pass through the opening, and the sensor inside ends the run.
 * Falls back to a procedural arch if the model is missing.
 */
export class FinishArea {
  readonly placement: FinishPlacement;
  private readonly scene: THREE.Scene;
  private readonly group: THREE.Group;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly bodies: RAPIER.RigidBody[] = [];

  constructor(
    physics: PhysicsWorld,
    scene: THREE.Scene,
    placement: FinishPlacement,
    arch: ModelAsset | null = null,
    fences: ModelAsset[] = [],
  ) {
    this.placement = placement;
    this.scene = scene;
    const c = getCourseConfig().finish;
    const groundCenter = terrainHeight(placement.x, placement.z);

    const group = new THREE.Group();
    this.group = group;
    scene.add(group);

    const openingHalf = arch ? this.buildArchModel(group, arch, placement, groundCenter, c.height) : null;
    if (openingHalf === null) this.buildProceduralArch(group, placement, groundCenter, c);

    const half = openingHalf ?? c.width / 2;
    const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.bodies.push(body);

    // Sensor across the opening: crossing the line ends the run.
    const sensor = RAPIER.ColliderDesc.cuboid(half, c.height / 2, c.sensorDepth / 2)
      .setTranslation(placement.x, groundCenter + c.height / 2, placement.z)
      .setSensor(true)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    physics.createCollider(sensor, body, { kind: 'finish', index: 0 });

    // Solid invisible walls block the sides so the rider must use the arch.
    const corridorHalf = getTerrainConfig().playWidth / 2;
    const sideSpan = corridorHalf - half;
    if (sideSpan > 0.5) {
      for (const dir of [-1, 1]) {
        const wall = RAPIER.ColliderDesc.cuboid(sideSpan / 2, c.height / 2, 2)
          .setTranslation(placement.x + dir * (half + sideSpan / 2), groundCenter + c.height / 2, placement.z)
          .setFriction(0.2)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
        // Hitting the finish barrier counts as a crash (failure), not the goal.
        physics.createCollider(wall, body, { kind: 'cliff', index: 0 });
      }
      this.buildSideFences(group, fences, placement, half, corridorHalf);
    }
  }

  /** Visible fence row across both shoulders of the finish line. */
  private buildSideFences(
    group: THREE.Group,
    fences: ModelAsset[],
    placement: FinishPlacement,
    half: number,
    corridorHalf: number,
  ): void {
    if (fences.length === 0) return;
    const spacing = Math.max(1.5, fences[0].radius * 1.9);
    const points: Array<{ x: number; y: number }> = [];
    for (const dir of [-1, 1]) {
      for (let d = half + spacing / 2; d < corridorHalf; d += spacing) {
        const x = placement.x + dir * d;
        points.push({ x, y: terrainHeight(x, placement.z) });
      }
    }
    if (points.length === 0) return;

    const variantOf = points.map((_, i) => i % fences.length);
    const counts = fences.map(() => 0);
    for (const v of variantOf) counts[v]++;
    const meshes = fences.map((asset, v) => {
      if (counts[v] === 0) return [];
      return asset.parts.map((part) => {
        const mesh = new THREE.InstancedMesh(part.geometry, part.material, counts[v]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
      });
    });

    const cursors = fences.map(() => 0);
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    points.forEach((point, i) => {
      const v = variantOf[i];
      position.set(point.x, point.y, placement.z);
      matrix.compose(position, quat, one);
      for (const mesh of meshes[v]) mesh.setMatrixAt(cursors[v]++, matrix);
    });
    for (const parts of meshes) {
      for (const mesh of parts) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    }
  }

  /** Places the finish-arch model, scaled uniformly to the target height. */
  private buildArchModel(
    group: THREE.Group,
    arch: ModelAsset,
    placement: FinishPlacement,
    groundCenter: number,
    targetHeight: number,
  ): number {
    const scale = targetHeight / Math.max(arch.height, 1e-4);
    for (const part of arch.parts) {
      const mesh = new THREE.Mesh(part.geometry, part.material);
      mesh.position.set(placement.x, groundCenter, placement.z);
      mesh.scale.setScalar(scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return arch.radius * scale;
  }

  /** Original procedural arch, used when the model is unavailable. */
  private buildProceduralArch(
    group: THREE.Group,
    placement: FinishPlacement,
    groundCenter: number,
    c: ReturnType<typeof getCourseConfig>['finish'],
  ): void {
    const half = c.width / 2;
    const tube = 0.9;
    const archRise = c.height * 0.35;
    const pillarTopY = groundCenter + c.height - archRise;

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.7, flatShading: true });
    const bannerMat = new THREE.MeshStandardMaterial({ color: CONFIG.colors.finish, roughness: 0.7, flatShading: true });
    this.materials.push(pillarMat, bannerMat);

    const pillarGeo = new THREE.CylinderGeometry(tube, tube, 1, 10);
    this.geometries.push(pillarGeo);
    for (const side of [-1, 1]) {
      const groundY = terrainHeight(placement.x + side * half, placement.z);
      const height = Math.max(pillarTopY - groundY, 1);
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.scale.y = height;
      pillar.position.set(placement.x + side * half, groundY + height / 2, placement.z);
      pillar.castShadow = true;
      group.add(pillar);
    }

    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(placement.x - half, pillarTopY, placement.z),
      new THREE.Vector3(placement.x, pillarTopY + archRise * 1.7, placement.z),
      new THREE.Vector3(placement.x + half, pillarTopY, placement.z),
    );
    const archGeo = new THREE.TubeGeometry(curve, 40, tube, 8, false);
    this.geometries.push(archGeo);
    const archMesh = new THREE.Mesh(archGeo, pillarMat);
    archMesh.castShadow = true;
    group.add(archMesh);

    const bannerGeo = new THREE.BoxGeometry(c.width * 0.42, c.height * 0.16, 0.5);
    this.geometries.push(bannerGeo);
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(placement.x, pillarTopY + archRise * 0.55, placement.z);
    banner.castShadow = true;
    group.add(banner);
  }

  dispose(physics: PhysicsWorld): void {
    for (const body of this.bodies) physics.world.removeRigidBody(body);
    this.bodies.length = 0;
    this.scene.remove(this.group);
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
  }
}
