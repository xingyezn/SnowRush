import * as THREE from 'three';
import { terrainHeight } from '../world/TerrainHeight';

const HALF_WIDTH = 0.32;
const MIN_STEP = 0.7;
const LIFT = 0.06;

/**
 * Persistent carve marks: a ribbon strip laid on the snow behind the board.
 * Samples are appended while riding; the oldest are dropped when full.
 */
export class SnowTrack {
  private readonly geometry = new THREE.BufferGeometry();
  private readonly mesh: THREE.Mesh;
  private readonly positions: Float32Array;
  private readonly left: THREE.Vector3[] = [];
  private readonly right: THREE.Vector3[] = [];
  private readonly capacity: number;
  private lastX = 0;
  private lastZ = 0;
  private has = false;
  private dirty = false;

  constructor(scene: THREE.Scene, capacity = 420) {
    this.capacity = capacity;
    this.positions = new Float32Array((capacity - 1) * 6 * 3);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setDrawRange(0, 0);
    const material = new THREE.MeshBasicMaterial({
      color: 0xaebccb,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.renderOrder = 1;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  private clear(): void {
    this.left.length = 0;
    this.right.length = 0;
    this.has = false;
    this.geometry.setDrawRange(0, 0);
  }

  update(position: THREE.Vector3, heading: number, grounded: boolean, speed: number): void {
    if (!grounded || speed < 3) {
      this.has = false;
      return;
    }
    if (!this.has || Math.hypot(position.x - this.lastX, position.z - this.lastZ) >= MIN_STEP) {
      this.has = true;
      this.lastX = position.x;
      this.lastZ = position.z;
      const rx = Math.cos(heading);
      const rz = -Math.sin(heading);
      const lx = position.x - rx * HALF_WIDTH;
      const lz = position.z - rz * HALF_WIDTH;
      const px = position.x + rx * HALF_WIDTH;
      const pz = position.z + rz * HALF_WIDTH;
      this.left.push(new THREE.Vector3(lx, terrainHeight(lx, lz) + LIFT, lz));
      this.right.push(new THREE.Vector3(px, terrainHeight(px, pz) + LIFT, pz));
      if (this.left.length > this.capacity) {
        this.left.shift();
        this.right.shift();
      }
      this.dirty = true;
    }
    if (this.dirty) this.rebuild();
  }

  private rebuild(): void {
    const count = this.left.length;
    let o = 0;
    for (let i = 0; i < count - 1; i++) {
      const l0 = this.left[i];
      const r0 = this.right[i];
      const l1 = this.left[i + 1];
      const r1 = this.right[i + 1];
      this.positions[o++] = l0.x;
      this.positions[o++] = l0.y;
      this.positions[o++] = l0.z;
      this.positions[o++] = r0.x;
      this.positions[o++] = r0.y;
      this.positions[o++] = r0.z;
      this.positions[o++] = r1.x;
      this.positions[o++] = r1.y;
      this.positions[o++] = r1.z;
      this.positions[o++] = l0.x;
      this.positions[o++] = l0.y;
      this.positions[o++] = l0.z;
      this.positions[o++] = r1.x;
      this.positions[o++] = r1.y;
      this.positions[o++] = r1.z;
      this.positions[o++] = l1.x;
      this.positions[o++] = l1.y;
      this.positions[o++] = l1.z;
    }
    this.geometry.setDrawRange(0, Math.max(0, (count - 1) * 6));
    const attribute = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    attribute.needsUpdate = true;
    this.dirty = false;
  }

  /** Called on respawn / new run so the marks do not stretch across the world. */
  reset(): void {
    this.clear();
  }

  dispose(): void {
    this.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
