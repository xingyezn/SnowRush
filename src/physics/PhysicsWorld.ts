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

export type ColliderKind =
  | 'player'
  | 'tree'
  | 'rock'
  | 'gate'
  | 'ramp'
  | 'checkpoint'
  | 'finish';

export interface ColliderMetadata {
  kind: ColliderKind;
  /** Index into the owning field's array, when relevant. */
  index: number;
}

/**
 * Thin wrapper around the Rapier world.
 * Responsibilities: stepping, collider creation, ground queries and collider
 * metadata/event routing. Must never touch Three.js objects, UI or score.
 */
export class PhysicsWorld {
  readonly world: RAPIER.World;

  private readonly ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
  private readonly events = new RAPIER.EventQueue(true);
  private readonly metadata = new Map<number, ColliderMetadata>();

  constructor(gravity: number) {
    this.world = new RAPIER.World({ x: 0, y: -gravity, z: 0 });
  }

  setFixedStep(dt: number): void {
    this.world.timestep = dt;
  }

  step(): void {
    this.world.step(this.events);
  }

  createCollider(
    desc: RAPIER.ColliderDesc,
    body: RAPIER.RigidBody,
    meta?: ColliderMetadata,
  ): RAPIER.Collider {
    const collider = this.world.createCollider(desc, body);
    if (meta) this.metadata.set(collider.handle, meta);
    return collider;
  }

  getMetadata(handle: number): ColliderMetadata | undefined {
    return this.metadata.get(handle);
  }

  countByKind(kind: ColliderKind): number {
    let count = 0;
    for (const meta of this.metadata.values()) {
      if (meta.kind === kind) count++;
    }
    return count;
  }

  drainCollisions(cb: (handle1: number, handle2: number, started: boolean) => void): void {
    this.events.drainCollisionEvents(cb);
  }

  /** Downward ray used for ground detection / slope normal sampling. */
  castGround(origin: RayOrigin, maxDistance: number, excludeBody?: RAPIER.RigidBody): GroundHit | null {
    return this.cast(origin, { x: 0, y: -1, z: 0 }, maxDistance, excludeBody);
  }

  /** General ray query (used for camera occlusion). */
  castRay(
    origin: RayOrigin,
    direction: RayOrigin,
    maxDistance: number,
    excludeBody?: RAPIER.RigidBody,
  ): GroundHit | null {
    return this.cast(origin, direction, maxDistance, excludeBody);
  }

  private cast(
    origin: RayOrigin,
    direction: RayOrigin,
    maxDistance: number,
    excludeBody?: RAPIER.RigidBody,
  ): GroundHit | null {
    this.ray.origin.x = origin.x;
    this.ray.origin.y = origin.y;
    this.ray.origin.z = origin.z;
    this.ray.dir.x = direction.x;
    this.ray.dir.y = direction.y;
    this.ray.dir.z = direction.z;

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
