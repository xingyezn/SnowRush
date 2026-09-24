import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';

export enum PlayerState {
  Ground = 'GROUND',
  Airborne = 'AIRBORNE',
  Landing = 'LANDING',
  Crash = 'CRASH',
  Respawn = 'RESPAWN',
}

export interface SpawnPoint {
  x: number;
  y: number;
  z: number;
  heading: number;
}

/**
 * The player entity: physics body + gameplay state.
 * Rapier owns the authoritative position and velocity; visuals read from here.
 */
export class Player {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  readonly groundNormal = new THREE.Vector3(0, 1, 0);

  spawn: SpawnPoint;
  heading: number;
  grounded = false;
  state: PlayerState = PlayerState.Airborne;

  /** Rotation accumulated since takeoff (radians). X = flip, Y = spin, Z = roll. */
  airRotationX = 0;
  airRotationY = 0;
  airRotationZ = 0;
  airTime = 0;
  /**
   * True when the current air was launched upward (Space jump or ramp), so
   * trick input is live. Terrain grazing (riding over a crest) keeps this
   * false, otherwise a held W would turn every bump into a frontflip.
   */
  airControlEnabled = false;
  /** Visual board lean into the current turn (radians). */
  lean = 0;
  /** Speed cap multiplier (boost pickups); 1 = normal. */
  speedMultiplier = 1;

  constructor(physics: PhysicsWorld, spawn: SpawnPoint) {
    this.spawn = { ...spawn };
    const p = CONFIG.player;

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(spawn.x, spawn.y, spawn.z)
      .lockRotations()
      .setLinearDamping(p.linearDamping)
      .setCanSleep(false)
      .setCcdEnabled(true);
    this.body = physics.world.createRigidBody(bodyDesc);

    // The controller drives velocity directly, so contact friction must not
    // fight it. Min lets the player's own (low) friction win over the terrain.
    const colliderDesc = RAPIER.ColliderDesc.capsule(p.capsuleHalfHeight, p.capsuleRadius)
      .setFriction(p.colliderFriction)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
      .setRestitution(0)
      .setDensity(p.density)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    this.collider = physics.createCollider(colliderDesc, this.body, { kind: 'player', index: 0 });

    this.heading = spawn.heading;
  }

  getPosition(target: THREE.Vector3): THREE.Vector3 {
    const t = this.body.translation();
    return target.set(t.x, t.y, t.z);
  }

  getVelocity(target: THREE.Vector3): THREE.Vector3 {
    const v = this.body.linvel();
    return target.set(v.x, v.y, v.z);
  }

  /** Horizontal speed in m/s. */
  getSpeed(): number {
    const v = this.body.linvel();
    return Math.hypot(v.x, v.z);
  }

  getSpeedKmh(): number {
    return this.getSpeed() * CONFIG.hud.speedUnitFactor;
  }

  setSpawn(spawn: SpawnPoint): void {
    this.spawn = { ...spawn };
  }

  resetAirRotations(): void {
    this.airRotationX = 0;
    this.airRotationY = 0;
    this.airRotationZ = 0;
    this.airTime = 0;
    this.airControlEnabled = false;
  }

  /** Enter the crash state: controls stop, the board scrubs most of its speed. */
  crash(): void {
    this.state = PlayerState.Crash;
    this.grounded = false;
    const v = this.body.linvel();
    this.body.setLinvel({ x: v.x * 0.25, y: v.y, z: v.z * 0.25 }, true);
  }

  /** Soft obstacle (snow drift): scrub horizontal speed without crashing. */
  scrubSpeed(factor: number): void {
    if (this.state === PlayerState.Crash) return;
    const v = this.body.linvel();
    this.body.setLinvel({ x: v.x * factor, y: v.y, z: v.z * factor }, true);
  }

  /** Respawn is the only place allowed to hard-set the physics transform. */
  respawn(): void {
    this.body.setTranslation({ x: this.spawn.x, y: this.spawn.y, z: this.spawn.z }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.heading = this.spawn.heading;
    this.grounded = false;
    this.airControlEnabled = false;
    this.state = PlayerState.Airborne;
  }
}
