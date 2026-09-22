import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import { terrainHeight } from '../world/TerrainHeight';
import type { Occluder } from '../world/CourseGenerator';

/**
 * Third person chase camera with damping.
 * Distance / height / FOV all grow with speed for a stronger sense of velocity.
 * Occlusion is analytic (terrain height + tree/rock cylinders) so it does not
 * depend on the physics query layer.
 */
export class FollowCamera {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly occluders: readonly Occluder[];
  private readonly desiredPosition = new THREE.Vector3();
  private readonly desiredTarget = new THREE.Vector3();
  private readonly smoothedTarget = new THREE.Vector3();
  private readonly behind = new THREE.Vector3();
  private readonly rayOrigin = new THREE.Vector3();
  private readonly rayDirection = new THREE.Vector3();
  private initialized = false;
  private laggedY = 0;
  private laggedInitialized = false;
  private shake = 0;

  constructor(camera: THREE.PerspectiveCamera, occluders: readonly Occluder[]) {
    this.camera = camera;
    this.occluders = occluders;
  }

  /** Adds an impulse to the camera shake (landing / crash feedback). */
  addShake(strength: number): void {
    if (strength > this.shake) this.shake = strength;
  }

  /**
   * Teleports the camera to the next computed position instead of interpolating
   * (used on respawn / new run so the camera never sweeps through the terrain).
   */
  snap(): void {
    this.initialized = false;
    this.laggedInitialized = false;
  }

  update(
    playerPosition: THREE.Vector3,
    heading: number,
    speed: number,
    dt: number,
    grounded = true,
  ): void {
    const c = CONFIG.camera;
    const t = THREE.MathUtils.clamp(speed / c.speedForMax, 0, 1);

    if (this.camera.view) this.camera.clearViewOffset();

    const distance = THREE.MathUtils.lerp(c.minDistance, c.maxDistance, t);
    const height = THREE.MathUtils.lerp(c.baseHeight, c.maxHeight, t);

    // Vertical follow lags while airborne so jumps read as leaving the ground.
    if (!this.laggedInitialized) {
      this.laggedY = playerPosition.y;
      this.laggedInitialized = true;
    }
    const yLerp = grounded ? c.positionLerp : c.jumpLagRate;
    this.laggedY += (playerPosition.y - this.laggedY) * (1 - Math.exp(-yLerp * dt));

    // Camera sits opposite the heading forward vector (-sin, 0, -cos).
    this.behind.set(Math.sin(heading), 0, Math.cos(heading));
    this.desiredPosition.copy(playerPosition).addScaledVector(this.behind, distance);
    this.desiredPosition.y = this.laggedY + height;

    this.applyOcclusion(playerPosition);

    // Keep the whole boom above the terrain, not just the camera end point:
    // otherwise a crest between the player and the camera reveals the underside.
    this.rayOrigin.copy(playerPosition);
    this.rayOrigin.y += c.lookHeight;
    let lift = 0;
    const samples = 8;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const x = this.rayOrigin.x + (this.desiredPosition.x - this.rayOrigin.x) * t;
      const z = this.rayOrigin.z + (this.desiredPosition.z - this.rayOrigin.z) * t;
      const y = this.rayOrigin.y + (this.desiredPosition.y - this.rayOrigin.y) * t;
      const needed = terrainHeight(x, z) + c.minGroundClearance - y;
      if (needed > lift) lift = needed;
    }
    if (lift > 0) this.desiredPosition.y += lift;

    this.desiredTarget.copy(playerPosition);
    this.desiredTarget.x += -Math.sin(heading) * c.lookAhead;
    this.desiredTarget.z += -Math.cos(heading) * c.lookAhead;
    this.desiredTarget.y += c.lookHeight;

    if (!this.initialized) {
      this.camera.position.copy(this.desiredPosition);
      this.smoothedTarget.copy(this.desiredTarget);
      this.initialized = true;
    } else {
      const positionLerp = 1 - Math.exp(-c.positionLerp * dt);
      const lookLerp = 1 - Math.exp(-c.lookLerp * dt);
      this.camera.position.lerp(this.desiredPosition, positionLerp);
      this.smoothedTarget.lerp(this.desiredTarget, lookLerp);
    }

    const targetFov = THREE.MathUtils.lerp(c.baseFov, c.maxFov, t);
    this.camera.fov += (targetFov - this.camera.fov) * (1 - Math.exp(-c.fovLerp * dt));
    this.camera.updateProjectionMatrix();

    // Camera shake is applied on top of the smoothed position so it decays
    // naturally instead of being fought by the follow lerp.
    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
      this.camera.position.z += (Math.random() - 0.5) * this.shake;
      this.shake *= Math.exp(-c.shakeDecay * dt);
    } else {
      this.shake = 0;
    }

    this.camera.lookAt(this.smoothedTarget);
  }

  /**
   * Menu character-preview framing: a fixed three-quarter front view with the
   * rider offset to the left of centre so the menu panel (right side) does not
   * cover the model. The camera never moves; the rider is spun in place instead
   * (see PlayerVisual.setPreviewYaw), so the background stays put.
   */
  showcase(playerPosition: THREE.Vector3, heading: number): void {
    const c = CONFIG.camera;
    const theta = heading + Math.PI + c.showcaseStartAngle;
    const distance = c.showcaseDistance;
    const camX = playerPosition.x + Math.sin(theta) * distance;
    const camZ = playerPosition.z + Math.cos(theta) * distance;
    const camY = playerPosition.y + c.showcaseHeight;

    this.camera.position.set(camX, Math.max(camY, terrainHeight(camX, camZ) + 0.6), camZ);
    this.camera.lookAt(
      playerPosition.x,
      playerPosition.y + c.showcaseLookOffsetY,
      playerPosition.z,
    );
    if (this.camera.fov !== c.showcaseFov) this.camera.fov = c.showcaseFov;

    // Shift the projection so the rider renders left of centre, clear of the
    // menu panel on the right.
    const aspect = this.camera.aspect;
    this.camera.setViewOffset(aspect, 1, aspect * c.showcaseOffset, 0, aspect, 1);
  }

  /** Free orbit camera for photo mode (drag yaw + wheel zoom). */
  photo(playerPosition: THREE.Vector3, heading: number, orbit: number, distance: number): void {
    if (this.camera.view) this.camera.clearViewOffset();
    const theta = heading + Math.PI + orbit;
    const camX = playerPosition.x + Math.sin(theta) * distance;
    const camZ = playerPosition.z + Math.cos(theta) * distance;
    const camY = playerPosition.y + CONFIG.photo.height;
    this.camera.position.set(camX, Math.max(camY, terrainHeight(camX, camZ) + 0.5), camZ);
    this.camera.lookAt(playerPosition.x, playerPosition.y + 0.4, playerPosition.z);
    if (this.camera.fov !== 50) {
      this.camera.fov = 50;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * First-person view: eye at the rider's head, level horizon (no flip roll).
   * Speed raises the FOV; landing bob adds a small vertical dip.
   */
  updateFirstPerson(
    playerPosition: THREE.Vector3,
    heading: number,
    speed: number,
    grounded: boolean,
    dt: number,
  ): void {
    if (this.camera.view) this.camera.clearViewOffset();
    const c = CONFIG.camera;
    const fp = c.firstPerson;
    const forwardX = -Math.sin(heading);
    const forwardZ = -Math.cos(heading);

    if (!this.laggedInitialized) {
      this.laggedY = playerPosition.y;
      this.laggedInitialized = true;
    }
    const yLerp = grounded ? c.positionLerp : c.jumpLagRate;
    this.laggedY += (playerPosition.y - this.laggedY) * (1 - Math.exp(-yLerp * dt));

    const camX = playerPosition.x + forwardX * fp.forwardOffset;
    const camZ = playerPosition.z + forwardZ * fp.forwardOffset;
    let camY = this.laggedY + fp.height;
    camY = Math.max(camY, terrainHeight(camX, camZ) + 0.35);

    this.camera.position.set(camX, camY, camZ);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(
      camX + forwardX * 12,
      camY + c.lookHeight * 0.4 - 0.1,
      camZ + forwardZ * 12,
    );

    const t = THREE.MathUtils.clamp(speed / c.speedForMax, 0, 1);
    const targetFov = THREE.MathUtils.lerp(fp.fovBase, fp.fovMax, t);
    this.camera.fov += (targetFov - this.camera.fov) * (1 - Math.exp(-c.fovLerp * dt));
    this.camera.updateProjectionMatrix();

    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
      this.camera.position.z += (Math.random() - 0.5) * this.shake;
      this.shake *= Math.exp(-c.shakeDecay * dt);
    } else {
      this.shake = 0;
    }
  }

  /** Pull the camera in when a tree / rock cylinder blocks the view. */
  private applyOcclusion(playerPosition: THREE.Vector3): void {
    const c = CONFIG.camera;
    this.rayOrigin.copy(playerPosition);
    this.rayOrigin.y += c.lookHeight;
    this.rayDirection.copy(this.desiredPosition).sub(this.rayOrigin);
    const cameraDistance = this.rayDirection.length();
    if (cameraDistance <= 0.001) return;
    this.rayDirection.divideScalar(cameraDistance);

    let nearest = cameraDistance;
    for (const o of this.occluders) {
      const ox = o.x - this.rayOrigin.x;
      const oz = o.z - this.rayOrigin.z;
      const reach = cameraDistance + o.radius + 2;
      if (ox * ox + oz * oz > reach * reach) continue;

      const dirXZ =
        this.rayDirection.x * this.rayDirection.x + this.rayDirection.z * this.rayDirection.z;
      if (dirXZ < 1e-6) continue;

      // Closest point on the ray (in the horizontal plane) to the cylinder axis.
      let t = (ox * this.rayDirection.x + oz * this.rayDirection.z) / dirXZ;
      if (t < 0) t = 0;
      else if (t > cameraDistance) t = cameraDistance;

      const px = this.rayOrigin.x + this.rayDirection.x * t;
      const pz = this.rayOrigin.z + this.rayDirection.z * t;
      if (Math.hypot(o.x - px, o.z - pz) > o.radius) continue;

      const py = this.rayOrigin.y + this.rayDirection.y * t;
      if (py < o.groundY || py > o.groundY + o.height) continue;

      if (t < nearest) nearest = t;
    }

    if (nearest < cameraDistance) {
      const clamped = Math.max(nearest - c.occlusionPadding, c.minOccludedDistance);
      this.desiredPosition.copy(this.rayOrigin).addScaledVector(this.rayDirection, clamped);
    }
  }
}
