import * as THREE from 'three';

const VERTEX_SHADER = `
  attribute float aLife;
  attribute float aSize;
  varying float vLife;
  void main() {
    vLife = aLife;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (320.0 / max(-mv.z, 0.001));
    gl_Position = projectionMatrix * mv;
  }
`;

// Soft round particle generated in the shader (no texture asset needed).
const FRAGMENT_SHADER = `
  uniform vec3 uColor;
  varying float vLife;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d);
    if (r > 0.5) discard;
    float alpha = smoothstep(0.5, 0.05, r) * vLife;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

/**
 * Fixed-capacity GPU particle pool rendered as THREE.Points with a procedural
 * soft circle. Emitting past capacity overwrites the oldest particle.
 */
export class ParticlePool {
  readonly points: THREE.Points;

  private readonly capacity: number;
  private readonly gravity: number;
  private readonly drag: number;
  private readonly positions: Float32Array;
  private readonly velocities: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly lifeAttr: Float32Array;
  private readonly sizeAttr: Float32Array;
  private readonly geometry: THREE.BufferGeometry;
  private cursor = 0;

  constructor(
    scene: THREE.Scene,
    capacity: number,
    color: number,
    options: { gravity?: number; drag?: number } = {},
  ) {
    this.capacity = capacity;
    this.gravity = options.gravity ?? -9;
    this.drag = options.drag ?? 1.5;

    this.positions = new Float32Array(capacity * 3);
    this.velocities = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.lifeAttr = new Float32Array(capacity);
    this.sizeAttr = new Float32Array(capacity);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aLife', new THREE.BufferAttribute(this.lifeAttr, 1));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizeAttr, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) } },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  emit(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    lifeSeconds: number,
    size: number,
  ): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;

    const p = i * 3;
    this.positions[p] = x;
    this.positions[p + 1] = y;
    this.positions[p + 2] = z;
    this.velocities[p] = vx;
    this.velocities[p + 1] = vy;
    this.velocities[p + 2] = vz;
    this.life[i] = lifeSeconds;
    this.maxLife[i] = lifeSeconds;
    this.lifeAttr[i] = 1;
    this.sizeAttr[i] = size;
  }

  update(dt: number): void {
    const damping = Math.exp(-this.drag * dt);
    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] <= 0) {
        if (this.lifeAttr[i] !== 0) this.lifeAttr[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      const p = i * 3;
      this.velocities[p + 1] += this.gravity * dt;
      this.velocities[p] *= damping;
      this.velocities[p + 1] *= damping;
      this.velocities[p + 2] *= damping;
      this.positions[p] += this.velocities[p] * dt;
      this.positions[p + 1] += this.velocities[p + 1] * dt;
      this.positions[p + 2] += this.velocities[p + 2] * dt;
      this.lifeAttr[i] = Math.max(this.life[i] / this.maxLife[i], 0);
    }

    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('aLife') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true;
  }
}
