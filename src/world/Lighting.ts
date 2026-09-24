import * as THREE from 'three';
import { CONFIG } from '../core/Config';

/**
 * Sky + sun lighting. The sun shadow frustum follows the player so a single
 * shadow map can cover a very long course.
 */
export class Lighting {
  private readonly sun: THREE.DirectionalLight;
  private readonly sunOffset = new THREE.Vector3(
    CONFIG.light.sunOffsetX,
    CONFIG.light.sunOffsetY,
    CONFIG.light.sunOffsetZ,
  );

  constructor(scene: THREE.Scene) {
    const hemi = new THREE.HemisphereLight(
      CONFIG.colors.skyLight,
      CONFIG.colors.groundLight,
      CONFIG.light.hemiIntensity,
    );
    scene.add(hemi);

    this.sun = new THREE.DirectionalLight(CONFIG.colors.sun, CONFIG.light.sunIntensity);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(CONFIG.light.shadowMapSize, CONFIG.light.shadowMapSize);

    const radius = CONFIG.light.shadowRadius;
    const shadowCamera = this.sun.shadow.camera;
    shadowCamera.left = -radius;
    shadowCamera.right = radius;
    shadowCamera.top = radius;
    shadowCamera.bottom = -radius;
    shadowCamera.near = 1;
    shadowCamera.far = CONFIG.light.shadowFar;
    shadowCamera.updateProjectionMatrix();
    this.sun.shadow.bias = CONFIG.light.shadowBias;

    scene.add(this.sun);
    scene.add(this.sun.target);
  }

  update(target: THREE.Vector3): void {
    this.sun.position.copy(target).add(this.sunOffset);
    this.sun.target.position.copy(target);
    this.sun.target.updateMatrixWorld();
  }

  /** Moves the light direction (used by the admin scene editor). */
  setOffset(x: number, y: number, z: number): void {
    this.sunOffset.set(x, y, z);
  }

  /** Quality toggle: disables the sun shadow pass entirely. */
  setShadows(enabled: boolean): void {
    this.sun.castShadow = enabled;
  }
}
