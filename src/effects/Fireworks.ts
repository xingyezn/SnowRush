import * as THREE from 'three';

const CAPACITY = 720;
const PARTICLES_PER_BURST = 44;
const PALETTE = [0xffd53d, 0xff8a3d, 0x4be06a, 0x3da5ff, 0xb85cff, 0xffffff];

/**
 * Simple additive point fireworks used for the finish celebration. Particles
 * are recycled from a fixed pool; a burst is emitted periodically around a
 * moving centre (the rider).
 */
export class Fireworks {
  private readonly geometry = new THREE.BufferGeometry();
  private readonly points: THREE.Points;
  private readonly positions = new Float32Array(CAPACITY * 3);
  private readonly colors = new Float32Array(CAPACITY * 3);
  private readonly velocities = new Float32Array(CAPACITY * 3);
  private readonly life = new Float32Array(CAPACITY);
  private readonly maxLife = new Float32Array(CAPACITY);
  private cursor = 0;
  private active = false;
  private spawnTimer = 0;
  private readonly color = new THREE.Color();

  constructor(scene: THREE.Scene) {
    // Start hidden below the world.
    for (let i = 0; i < CAPACITY; i++) this.positions[i * 3 + 1] = -9999;
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      fog: false,
    });
    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  start(): void {
    this.active = true;
    this.spawnTimer = 0;
  }

  stop(): void {
    this.active = false;
    for (let i = 0; i < CAPACITY; i++) {
      this.life[i] = this.maxLife[i];
      this.positions[i * 3 + 1] = -9999;
    }
    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  update(dt: number, center: THREE.Vector3): void {
    if (this.active) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = 0.6;
        const ox = (Math.random() - 0.5) * 6;
        const oz = (Math.random() - 0.5) * 6;
        const oy = 3 + Math.random() * 2.5;
        this.burst(center.x + ox, center.y + oy, center.z + oz);
      }
    }

    let alive = false;
    for (let i = 0; i < CAPACITY; i++) {
      if (this.life[i] >= this.maxLife[i]) continue;
      alive = true;
      this.life[i] += dt;
      const p = i * 3;
      this.velocities[p + 1] -= 9.8 * dt;
      this.positions[p] += this.velocities[p] * dt;
      this.positions[p + 1] += this.velocities[p + 1] * dt;
      this.positions[p + 2] += this.velocities[p + 2] * dt;
      if (this.life[i] >= this.maxLife[i]) this.positions[p + 1] = -9999;
    }

    if (alive) {
      (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (this.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  private burst(x: number, y: number, z: number): void {
    const hex = PALETTE[(Math.random() * PALETTE.length) | 0];
    this.color.setHex(hex);
    for (let n = 0; n < PARTICLES_PER_BURST; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % CAPACITY;
      const p = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 4 + Math.random() * 5;
      this.velocities[p] = Math.sin(phi) * Math.cos(theta) * speed;
      this.velocities[p + 1] = Math.cos(phi) * speed;
      this.velocities[p + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      this.positions[p] = x;
      this.positions[p + 1] = y;
      this.positions[p + 2] = z;
      this.colors[p] = this.color.r;
      this.colors[p + 1] = this.color.g;
      this.colors[p + 2] = this.color.b;
      this.life[i] = 0;
      this.maxLife[i] = 1 + Math.random() * 0.9;
    }
  }
}
