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

  update(
    playerPosition: THREE.Vector3,
    heading: number,
    speed: number,
    dt: number,
    grounded = true,
  ): void {
    const c = CONFIG.camera;
    const t = THREE.MathUtils.clamp(speed / c.speedForMax, 0, 1);

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

    // Never let the camera sink into a hill behind the player.
    const groundAtCamera = terrainHeight(this.desiredPosition.x, this.desiredPosition.z);
    const minY = groundAtCamera + c.minGroundClearance;
    if (this.desiredPosition.y < minY) this.desiredPosition.y = minY;

    this.applyOcclusion(playerPosition);

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
