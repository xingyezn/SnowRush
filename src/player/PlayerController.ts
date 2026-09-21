import { CONFIG } from '../core/Config';
import type { InputState } from '../core/InputManager';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { Player, PlayerState } from './Player';

/**
 * Translates input into arcade snowboarding movement.
 *
 * Steering never edits position directly. A/D rotate the heading, and the
 * velocity direction is pulled toward that heading ("grip"), which produces a
 * carved arc. Downhill acceleration comes from gravity projected onto the
 * ground plane; the vertical component is replaced with a slope-tangent value
 * so the board hugs the terrain.
 */
export class PlayerController {
  private readonly player: Player;
  private readonly input: InputState;
  private readonly physics: PhysicsWorld;
  private readonly groundRayLength: number;

  constructor(player: Player, input: InputState, physics: PhysicsWorld) {
    this.player = player;
    this.input = input;
    this.physics = physics;
    const p = CONFIG.player;
    this.groundRayLength = p.capsuleHalfHeight + p.capsuleRadius + p.groundRayPadding;
  }

  update(dt: number): void {
    const p = CONFIG.player;
    const body = this.player.body;
    const velocity = body.linvel();
    const position = body.translation();

    const groundHit = this.physics.castGround(position, this.groundRayLength, body);
    const grounded = groundHit !== null && groundHit.normal.y >= p.minGroundNormalY;
    this.player.grounded = grounded;
    if (groundHit) {
      this.player.groundNormal.set(groundHit.normal.x, groundHit.normal.y, groundHit.normal.z);
    }
    this.player.state = grounded ? PlayerState.Ground : PlayerState.Airborne;

    const turnInput = (this.input.isDown('right') ? 1 : 0) - (this.input.isDown('left') ? 1 : 0);
    const accelInput = this.input.isDown('accelerate') ? 1 : 0;
    const brakeInput = this.input.isDown('brake') ? 1 : 0;

    let speed = Math.hypot(velocity.x, velocity.z);

    // Heading rotation. turnSpeed scales with speed so low-speed turning is
    // not twitchy, and airborne turning is reduced.
    const speedRatio = Math.min(speed / p.maxSpeed, 1);
    const turnFactor = p.turnSpeedMinFactor + (p.turnSpeedAtMaxFactor - p.turnSpeedMinFactor) * speedRatio;
    const airScale = grounded ? 1 : p.airTurnFactor;
    this.player.heading -= turnInput * p.turnSpeed * turnFactor * airScale * dt;

    const forwardX = -Math.sin(this.player.heading);
    const forwardZ = -Math.cos(this.player.heading);

    let dirX: number;
    let dirZ: number;
    if (speed > 0.01) {
      dirX = velocity.x / speed;
      dirZ = velocity.z / speed;
    } else {
      dirX = forwardX;
      dirZ = forwardZ;
    }
    const grip = 1 - Math.exp(-p.gripRate * dt);
    dirX += (forwardX - dirX) * grip;
    dirZ += (forwardZ - dirZ) * grip;
    const dirLength = Math.hypot(dirX, dirZ) || 1;
    dirX /= dirLength;
    dirZ /= dirLength;

    if (accelInput) speed += p.acceleration * dt;
    if (brakeInput) speed -= p.brakeForce * dt;

    if (grounded) {
      const n = this.player.groundNormal;
      const slopeAccelX = CONFIG.world.gravity * n.y * n.x;
      const slopeAccelZ = CONFIG.world.gravity * n.y * n.z;
      speed += (slopeAccelX * dirX + slopeAccelZ * dirZ) * p.slopeAccelFactor * dt;
    }

    speed -= p.turnDrag * Math.abs(turnInput) * speed * dt;
    speed *= Math.pow(p.friction, dt * 60);

    if (grounded && brakeInput === 0 && speed < p.minGlideSpeed) speed = p.minGlideSpeed;
    if (speed < 0) speed = 0;
    if (speed > p.maxSpeed) speed = p.maxSpeed;

    let vertical = velocity.y;
    if (grounded) {
      const n = this.player.groundNormal;
      const normalY = Math.max(n.y, 0.2);
      vertical = -((dirX * speed) * n.x + (dirZ * speed) * n.z) / normalY;
      if (vertical > 0) vertical = 0;
    }

    body.setLinvel({ x: dirX * speed, y: vertical, z: dirZ * speed }, true);
  }
}
