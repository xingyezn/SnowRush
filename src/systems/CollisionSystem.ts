import type { ColliderMetadata, PhysicsWorld } from '../physics/PhysicsWorld';
import type { CourseGenerator } from '../world/CourseGenerator';

export interface CollisionHandlers {
  onCrash(): void;
  onGate(index: number): void;
  onCheckpoint(index: number): void;
  onFinish(): void;
  onItem(index: number): void;
  /** Soft obstacle: handled without ending the run. */
  onSnowpile(): void;
}

/**
 * Routes Rapier collision events between the player and world objects.
 * Objects never mutate player state directly; the handlers decide what happens.
 */
export class CollisionSystem {
  private readonly physics: PhysicsWorld;
  private readonly course: CourseGenerator;
  private readonly handlers: CollisionHandlers;

  constructor(physics: PhysicsWorld, course: CourseGenerator, handlers: CollisionHandlers) {
    this.physics = physics;
    this.course = course;
    this.handlers = handlers;
  }

  update(): void {
    this.physics.drainCollisions((handle1, handle2, started) => {
      if (!started) return;

      const a = this.physics.getMetadata(handle1);
      const b = this.physics.getMetadata(handle2);
      if (!a || !b) return;

      let other: ColliderMetadata | null = null;
      if (a.kind === 'player') other = b;
      else if (b.kind === 'player') other = a;
      if (!other) return;

      switch (other.kind) {
        case 'tree':
        case 'rock':
        case 'cliff':
          this.handlers.onCrash();
          break;
        case 'gate': {
          const gate = this.course.gates.gates[other.index];
          if (gate && !gate.passed) {
            gate.passed = true;
            this.handlers.onGate(other.index);
          }
          break;
        }
        case 'checkpoint': {
          const checkpoint = this.course.checkpoints.checkpoints[other.index];
          if (checkpoint && !checkpoint.reached) {
            checkpoint.reached = true;
            this.handlers.onCheckpoint(other.index);
          }
          break;
        }
        case 'finish':
          this.handlers.onFinish();
          break;
        case 'item':
          this.handlers.onItem(other.index);
          break;
        case 'snowpile':
          this.handlers.onSnowpile();
          break;
        default:
          break;
      }
    });
  }
}
