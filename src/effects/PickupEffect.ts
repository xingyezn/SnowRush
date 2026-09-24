import * as THREE from 'three';

interface Burst {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  life: number;
  active: boolean;
}

const DURATION = 0.5;

/** Pool of expanding, fading rings shown when a collectible is picked up. */
export class PickupEffect {
  private readonly bursts: Burst[] = [];
  private index = 0;

  constructor(scene: THREE.Scene, capacity = 8) {
    const geometry = new THREE.RingGeometry(0.45, 0.68, 20);
    geometry.rotateX(-Math.PI / 2);
    for (let i = 0; i < capacity; i++) {
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      scene.add(mesh);
      this.bursts.push({ mesh, material, life: 0, active: false });
    }
  }

  spawn(x: number, y: number, z: number, color: number): void {
    const burst = this.bursts[this.index];
    this.index = (this.index + 1) % this.bursts.length;
    burst.mesh.position.set(x, y + 0.1, z);
    burst.mesh.scale.setScalar(0.6);
    burst.material.color.setHex(color);
    burst.material.opacity = 0.9;
    burst.mesh.visible = true;
    burst.life = 0;
    burst.active = true;
  }

  update(dt: number): void {
    for (const burst of this.bursts) {
      if (!burst.active) continue;
      burst.life += dt;
      const t = burst.life / DURATION;
      if (t >= 1) {
        burst.active = false;
        burst.mesh.visible = false;
        continue;
      }
      burst.mesh.scale.setScalar(0.6 + t * 2.4);
      burst.material.opacity = 0.9 * (1 - t);
    }
  }
}
