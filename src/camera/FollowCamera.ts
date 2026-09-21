import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import { terrainHeight } from '../world/TerrainHeight';

/**
 * Third person chase camera with damping.
 * Distance / height / FOV all grow with speed for a stronger sense of velocity.
 */
export class FollowCamera {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly desiredPosition = new THREE.Vector3();
  private readonly desiredTarget = new THREE.Vector3();
  private readonly smoothedTarget = new THREE.Vector3();
  private readonly behind = new THREE.Vector3();
  private initialized = false;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  update(playerPosition: THREE.Vector3, heading: number, speed: number, dt: number): void {
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
