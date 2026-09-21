import * as RAPIER from '@dimforge/rapier3d';

export interface RayOrigin {
  x: number;
  y: number;
  z: number;
}

export interface GroundHit {
  collider: RAPIER.Collider;
  distance: number;
  normal: RayOrigin;
}

/**
 * Thin wrapper around the Rapier world.
 * Responsibilities: stepping, collider creation and ground queries.
 * Must never touch Three.js objects, UI or score.
 */
export class PhysicsWorld {
  readonly world: RAPIER.World;
  private readonly ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });

  constructor(gravity: number) {
    this.world = new RAPIER.World({ x: 0, y: -gravity, z: 0 });
  }

  setFixedStep(dt: number): void {
    this.world.timestep = dt;
  }

  step(): void {
    this.world.step();
  }

  /** Downward ray used for ground detection / slope normal sampling. */
  castGround(origin: RayOrigin, maxDistance: number, excludeBody?: RAPIER.RigidBody): GroundHit | null {
    this.ray.origin.x = origin.x;
    this.ray.origin.y = origin.y;
    this.ray.origin.z = origin.z;
    this.ray.dir.x = 0;
    this.ray.dir.y = -1;
    this.ray.dir.z = 0;

    const hit = this.world.castRayAndGetNormal(
      this.ray,
      maxDistance,
      true,
      undefined,
      undefined,
      undefined,
      excludeBody,
    );
    if (!hit) return null;

    return {
      collider: hit.collider,
      distance: hit.timeOfImpact,
      normal: hit.normal,
    };
  }
}
