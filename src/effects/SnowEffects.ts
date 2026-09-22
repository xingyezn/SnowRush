import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import type { Player } from '../player/Player';
import { ParticlePool } from './ParticlePool';

/**
 * All snow visuals: board trail, turning spray, landing burst and ambient
 * falling snow. Effects never touch physics or gameplay state.
 */
export class SnowEffects {
  private readonly trail: ParticlePool;
  private readonly burst: ParticlePool;
  private readonly ambient: ParticlePool;
  private readonly playerPosition = new THREE.Vector3();

  private trailAccumulator = 0;
  private ambientAccumulator = 0;
  private fallSpeed = 0;
  private wasGrounded = true;
  private density = 1;

  constructor(scene: THREE.Scene) {
    const e = CONFIG.effects;
    const color = CONFIG.colors.snowParticle;
    this.trail = new ParticlePool(scene, e.trailCapacity, color, { gravity: -14, drag: 2.2 });
    this.burst = new ParticlePool(scene, e.burstCapacity, color, { gravity: -12, drag: 1.8 });
    this.ambient = new ParticlePool(scene, e.ambientCapacity, color, { gravity: -1.2, drag: 0.1 });
  }

  /** Scales emission rates so lower quality levels generate fewer particles. */
  setDensity(density: number): void {
    this.density = Math.min(Math.max(density, 0.2), 1.5);
  }

  update(dt: number, player: Player): { landed: boolean; strength: number } {
    const pos = player.getPosition(this.playerPosition);
    const speed = player.getSpeed();
    const grounded = player.grounded;

    if (grounded && speed > 4) {
      const turn = Math.abs(player.lean);
      this.trailAccumulator += dt * (speed * 1.1 + turn * 160) * this.density;
      const backX = Math.sin(player.heading);
      const backZ = Math.cos(player.heading);
      while (this.trailAccumulator >= 1) {
        this.trailAccumulator -= 1;
        const spread = 0.3 + turn * 1.8;
        const jx = (Math.random() - 0.5) * spread;
        const jz = (Math.random() - 0.5) * spread;
        this.trail.emit(
          pos.x + backX * 0.9 + jx,
          pos.y - 0.8 + Math.random() * 0.25,
          pos.z + backZ * 0.9 + jz,
          backX * (1.5 + Math.random() * 2.5) + jx * 3.5,
          1.2 + Math.random() * 3,
          backZ * (1.5 + Math.random() * 2.5) + jz * 3.5,
          0.6 + Math.random() * 0.6,
          0.22 + Math.random() * 0.16 + turn * 0.16,
        );
      }
    } else {
      this.trailAccumulator = 0;
    }

    this.ambientAccumulator += dt * CONFIG.effects.ambientRate * this.density;
    while (this.ambientAccumulator >= 1) {
      this.ambientAccumulator -= 1;
      const radius = CONFIG.effects.ambientRadius;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * radius;
      this.ambient.emit(
        pos.x + Math.cos(angle) * dist,
        pos.y + 6 + Math.random() * 14,
        pos.z + Math.sin(angle) * dist,
        (Math.random() - 0.5) * 0.6,
        -1.2 - Math.random(),
        (Math.random() - 0.5) * 0.6,
        5 + Math.random() * 3,
        0.09 + Math.random() * 0.08,
      );
    }

    // Landing burst, strength scaled by the impact speed.
    let landed = false;
    let strength = 0;
    if (!grounded) {
      this.fallSpeed = Math.max(this.fallSpeed, Math.max(-player.body.linvel().y, 0));
    } else if (!this.wasGrounded) {
      strength = Math.min(this.fallSpeed / 12, 1);
      this.burstAt(pos, strength);
      landed = true;
      this.fallSpeed = 0;
    }
    this.wasGrounded = grounded;

    this.trail.update(dt);
    this.burst.update(dt);
    this.ambient.update(dt);

    return { landed, strength };
  }

  private burstAt(position: THREE.Vector3, strength: number): void {
    const count = Math.round((12 + strength * 18) * this.density);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5 * (0.5 + strength);
      this.burst.emit(
        position.x + (Math.random() - 0.5) * 0.6,
        position.y - 0.75 + Math.random() * 0.2,
        position.z + (Math.random() - 0.5) * 0.6,
        Math.cos(angle) * speed,
        1.5 + Math.random() * 3 * (0.5 + strength),
        Math.sin(angle) * speed,
        0.4 + Math.random() * 0.5,
        0.12 + Math.random() * 0.1,
      );
    }
  }
}
