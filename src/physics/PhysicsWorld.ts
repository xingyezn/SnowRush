import * as RAPIER from '@dimforge/rapier3d';

export type ColliderKind =
  | 'player'
  | 'tree'
  | 'rock'
  | 'gate'
  | 'ramp'
  | 'checkpoint'
  | 'finish'
  | 'item'
  | 'snowpile'
  | 'cliff';

export interface ColliderMetadata {
  kind: ColliderKind;
  /** Index into the owning field's array, when relevant. */
  index: number;
}

/**
 * Thin wrapper around the Rapier world.
 * Responsibilities: stepping, collider creation and collider metadata/event
 * routing. Must never touch Three.js objects, UI or score.
 */
export class PhysicsWorld {
  readonly world: RAPIER.World;

  private readonly events = new RAPIER.EventQueue(true);
  private readonly metadata = new Map<number, ColliderMetadata>();
  private readonly persistent = new Set<number>();

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
    if (meta) {
      this.metadata.set(collider.handle, meta);
      if (meta.kind === 'player') this.persistent.add(collider.handle);
    }
    return collider;
  }

  /**
   * Removes every world body except `keep` (the player) and resets collider
   * metadata to the persistent (player) entries. Used to rebuild the course.
   */
  clearWorldBodies(keep: RAPIER.RigidBody): void {
    const remove: RAPIER.RigidBody[] = [];
    this.world.forEachRigidBody((body) => {
      if (body !== keep) remove.push(body);
    });
    for (const body of remove) this.world.removeRigidBody(body);

    const keepMeta = new Map<number, ColliderMetadata>();
    for (const handle of this.persistent) {
      const meta = this.metadata.get(handle);
      if (meta) keepMeta.set(handle, meta);
    }
    this.metadata.clear();
    for (const [handle, meta] of keepMeta) this.metadata.set(handle, meta);
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
}
