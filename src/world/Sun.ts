import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import type { ModelAsset } from './ModelLibrary';

/**
 * Visible sun disc in the sky. It sits at a fixed offset from the rider (the
 * same direction as the directional light), so it always reads in the same part
 * of the sky. Drawn unlit and fog-free so it stays bright at that distance.
 */
export class Sun {
  private readonly group = new THREE.Group();
  private readonly direction = new THREE.Vector3();
  private readonly meshes: THREE.Mesh[] = [];
  private readonly assetHeight: number;

  constructor(scene: THREE.Scene, asset: ModelAsset | null) {
    this.assetHeight = Math.max(asset?.height ?? 1, 1e-4);
    if (!asset) return;
    const scale = CONFIG.sun.size / this.assetHeight;
    for (const part of asset.parts) {
      const source = part.material as THREE.MeshStandardMaterial;
      const material = new THREE.MeshBasicMaterial({
        map: source.map ?? null,
        color: source.map ? 0xffffff : 0xffd873,
        fog: false,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(part.geometry, material);
      mesh.scale.setScalar(scale);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.meshes.push(mesh);
    }
    scene.add(this.group);
  }

  /** Rescales the disc (used by the admin scene editor). */
  setSize(size: number): void {
    const scale = size / this.assetHeight;
    for (const mesh of this.meshes) mesh.scale.setScalar(scale);
  }

  update(x: number, y: number, z: number): void {
    const azimuth = THREE.MathUtils.degToRad(CONFIG.sun.azimuth);
    const elevation = THREE.MathUtils.degToRad(CONFIG.sun.elevation);
    const cosE = Math.cos(elevation);
    this.direction
      .set(cosE * Math.sin(azimuth), Math.sin(elevation), cosE * Math.cos(azimuth))
      .normalize();
    const d = CONFIG.sun.distance;
    this.group.position.set(
      x + this.direction.x * d,
      y + this.direction.y * d,
      z + this.direction.z * d,
    );
  }
}
