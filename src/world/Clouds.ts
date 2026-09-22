import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONFIG } from '../core/Config';
import { Rng } from '../core/Rng';

/**
 * Low-poly cloud puffs high above the course. They follow the rider so they
 * always sit in the sky, and drift slowly for a little life. No physics, no
 * shadows, no fog (fog would erase them at this distance).
 */
export class Clouds {
  private readonly mesh: THREE.InstancedMesh;

  constructor(scene: THREE.Scene) {
    const c = CONFIG.clouds;
    const rng = new Rng(CONFIG.course.seed ^ 0x51ed270b);

    // A handful of overlapping spheres forms one puffy cloud.
    const puffs: Array<[number, number, number, number]> = [
      [0, 0, 0, 1],
      [1.05, 0.12, 0.15, 0.72],
      [-0.95, 0.06, -0.15, 0.68],
      [0.35, 0.42, -0.05, 0.6],
      [-0.35, 0.34, 0.18, 0.52],
    ];
    const parts = puffs.map(([x, y, z, radius]) => {
      const geometry = new THREE.SphereGeometry(radius, 7, 5);
      geometry.translate(x, y, z);
      return geometry;
    });
    const geometry = mergeGeometries(parts) ?? parts[0];

    const material = new THREE.MeshStandardMaterial({
      color: c.color,
      roughness: 1,
      flatShading: true,
      fog: false,
    });

    const mesh = new THREE.InstancedMesh(geometry, material, c.count);
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < c.count; i++) {
      const angle = (i / c.count) * Math.PI * 2 + rng.range(-0.25, 0.25);
      const radius = rng.range(c.minRadius, c.maxRadius);
      const height = rng.range(c.minHeight, c.maxHeight);
      quat.setFromAxisAngle(up, rng.range(0, Math.PI * 2));
      position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      scale.setScalar(rng.range(60, 140));
      matrix.compose(position, quat, scale);
      mesh.setMatrixAt(i, matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    this.mesh = mesh;
    scene.add(mesh);
  }

  update(x: number, groundY: number, z: number, dt: number): void {
    this.mesh.position.set(x, groundY, z);
    this.mesh.rotation.y += dt * CONFIG.clouds.driftSpeed;
  }
}
