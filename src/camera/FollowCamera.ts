import * as THREE from 'three';
import type { RigidBody } from '@dimforge/rapier3d';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { terrainHeight } from '../world/TerrainHeight';

/**
 * Third person chase camera with damping.
 * Distance / height / FOV all grow with speed for a stronger sense of velocity.
 */
export class FollowCamera {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly physics: PhysicsWorld;
  private readonly desiredPosition = new THREE.Vector3();
  private readonly desiredTarget = new THREE.Vector3();
  private readonly smoothedTarget = new THREE.Vector3();
  private readonly behind = new THREE.Vector3();
  private readonly rayOrigin = new THREE.Vector3();
  private readonly rayDirection = new THREE.Vector3();
  private initialized = false;

  constructor(camera: THREE.PerspectiveCamera, physics: PhysicsWorld) {
    this.camera = camera;
    this.physics = physics;
  }

  update(
    playerPosition: THREE.Vector3,
    heading: number,
    speed: number,
    dt: number,
    excludeBody?: RigidBody,
  ): void {
    const c = CONFIG.camera;
    const t = THREE.MathUtils.clamp(speed / c.speedForMax, 0, 1);

    const distance = THREE.MathUtils.lerp(c.minDistance, c.maxDistance, t);
    const height = THREE.MathUtils.lerp(c.baseHeight, c.maxHeight, t);

    // Camera sits opposite the heading forward vector (-sin, 0, -cos).
    this.behind.set(Math.sin(heading), 0, Math.cos(heading));
    this.desiredPosition.copy(playerPosition).addScaledVector(this.behind, distance);
    this.desiredPosition.y += height;

    // Never let the camera sink into a hill behind the player.
    const groundAtCamera = terrainHeight(this.desiredPosition.x, this.desiredPosition.z);
    const minY = groundAtCamera + c.minGroundClearance;
    if (this.desiredPosition.y < minY) this.desiredPosition.y = minY;

    // Pull the camera in if a tree / rock / ramp sits between it and the player.
    this.rayOrigin.copy(playerPosition);
    this.rayOrigin.y += c.lookHeight;
    this.rayDirection.copy(this.desiredPosition).sub(this.rayOrigin);
    const cameraDistance = this.rayDirection.length();
    if (cameraDistance > 0.001) {
      this.rayDirection.divideScalar(cameraDistance);
      const hit = this.physics.castRay(this.rayOrigin, this.rayDirection, cameraDistance, excludeBody);
      if (hit && hit.distance < cameraDistance) {
        const clamped = Math.max(hit.distance - c.occlusionPadding, c.minOccludedDistance);
        this.desiredPosition.copy(this.rayOrigin).addScaledVector(this.rayDirection, clamped);
      }
    }

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
    this.camera.lookAt(this.smoothedTarget);
  }
}
