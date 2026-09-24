import { CONFIG } from '../core/Config';
import type { InputState } from '../core/InputManager';
import { terrainHeight, terrainNormalComponents } from '../world/TerrainHeight';
import { Player, PlayerState } from './Player';

/**
 * Translates input into arcade snowboarding movement.
 *
 * Ground: A/D rotate the heading and velocity direction follows via "grip",
 * producing carved arcs. Steering never edits position directly.
 * Air: momentum is ballistic; A/D spin the heading (yaw) and W/S pitch the
 * board (front / backflip), accumulating rotation for the TrickSystem.
 */
export class PlayerController {
  private readonly player: Player;
  private readonly input: InputState;
  private readonly groundClearance: number;
  private jumpLock = 0;

  constructor(player: Player, input: InputState) {
    this.player = player;
    this.input = input;
    const p = CONFIG.player;
    this.groundClearance = p.capsuleHalfHeight + p.capsuleRadius + p.groundRayPadding;
  }

  update(dt: number): void {
    const p = CONFIG.player;
    const maxSpeed = p.maxSpeed * this.player.speedMultiplier;
    const body = this.player.body;
    const velocity = body.linvel();
    const position = body.translation();
    const wasGrounded = this.player.grounded;

    // Grounding comes from the analytic terrain function (the same one the mesh
    // and heightfield use). This is smooth, cheap and independent of Rapier's
    // query layer, which does not report static colliders reliably in browsers.
    const clearance = position.y - terrainHeight(position.x, position.z);
    const grounded = clearance <= this.groundClearance;
    this.player.grounded = grounded;
    const normal = terrainNormalComponents(position.x, position.z);
    this.player.groundNormal.set(normal.x, normal.y, normal.z);

    // Natural takeoff (riding off a lip or crest). Only a genuine launch
    // (positive vertical speed, e.g. a ramp) unlocks trick input; merely
    // skimming over a bump must not turn a held W into a frontflip.
    if (!grounded && wasGrounded) {
      this.player.resetAirRotations();
      this.player.airControlEnabled = velocity.y > CONFIG.player.airControlMinUpSpeed;
    }
    if (this.jumpLock > 0) this.jumpLock -= dt;

    const turnInput = (this.input.isDown('right') ? 1 : 0) - (this.input.isDown('left') ? 1 : 0);
    const accelInput = this.input.isDown('accelerate') ? 1 : 0;
    const brakeInput = this.input.isDown('brake') ? 1 : 0;

    let speed = Math.hypot(velocity.x, velocity.z);

    if (grounded) {
      const speedRatio = Math.min(speed / maxSpeed, 1);
      const turnFactor =
        p.turnSpeedMinFactor + (p.turnSpeedAtMaxFactor - p.turnSpeedMinFactor) * speedRatio;
      this.player.heading -= turnInput * p.turnSpeed * turnFactor * dt;

      const targetLean = -turnInput * p.maxLean * Math.min(speed / 20, 1);
      this.player.lean += (targetLean - this.player.lean) * (1 - Math.exp(-p.leanRate * dt));

      const forwardX = -Math.sin(this.player.heading);
      const forwardZ = -Math.cos(this.player.heading);
      let dirX = speed > 0.01 ? velocity.x / speed : forwardX;
      let dirZ = speed > 0.01 ? velocity.z / speed : forwardZ;
      const grip = 1 - Math.exp(-p.gripRate * dt);
      dirX += (forwardX - dirX) * grip;
      dirZ += (forwardZ - dirZ) * grip;
      const dirLength = Math.hypot(dirX, dirZ) || 1;
      dirX /= dirLength;
      dirZ /= dirLength;

      if (accelInput) speed += p.acceleration * dt;
      if (brakeInput) speed -= p.brakeForce * dt;

      const n = this.player.groundNormal;
      const slopeAccelX = CONFIG.world.gravity * n.y * n.x;
      const slopeAccelZ = CONFIG.world.gravity * n.y * n.z;
      speed += (slopeAccelX * dirX + slopeAccelZ * dirZ) * p.slopeAccelFactor * dt;

      speed -= p.turnDrag * Math.abs(turnInput) * speed * dt;
      speed *= Math.pow(p.friction, dt * 60);
      if (brakeInput === 0 && speed < p.minGlideSpeed) speed = p.minGlideSpeed;
      if (speed < 0) speed = 0;
      if (speed > maxSpeed) speed = maxSpeed;

      // Velocity tangent to the slope keeps the board glued to the surface.
      let vertical = -((dirX * speed) * n.x + (dirZ * speed) * n.z) / Math.max(n.y, 0.2);
      if (vertical > 0) vertical = 0;

      let jumped = false;
      if (this.input.wasPressed('jump') && this.jumpLock <= 0) {
        this.jumpLock = p.jumpLockTime;
        vertical = p.jumpForce;
        jumped = true;
        this.player.resetAirRotations();
        this.player.airControlEnabled = true;
        this.player.grounded = false;
        this.player.state = PlayerState.Airborne;
      }

      body.setLinvel({ x: dirX * speed, y: vertical, z: dirZ * speed }, true);
      if (!jumped) this.player.state = PlayerState.Ground;
      return;
    }

    // --- Airborne: ballistic momentum + free rotation -----------------------
    // Trick input only applies after a real launch; otherwise (terrain grazing)
    // the rider simply keeps the momentum and heading they took off with.
    if (this.player.airControlEnabled) {
      const spinDelta = turnInput * p.airSpinSpeed * dt;
      this.player.heading -= spinDelta;
      this.player.airRotationY -= spinDelta;

      const flipInput = accelInput - brakeInput; // W = frontflip, S = backflip
      this.player.airRotationX -= flipInput * p.airFlipSpeed * dt;
    }
    this.player.airTime += dt;
    this.player.lean += (0 - this.player.lean) * (1 - Math.exp(-p.leanRate * dt));

    let dirX = velocity.x;
    let dirZ = velocity.z;
    const horizontal = Math.hypot(dirX, dirZ);
    if (horizontal > 0.001) {
      dirX /= horizontal;
      dirZ /= horizontal;
    } else {
      dirX = -Math.sin(this.player.heading);
      dirZ = -Math.cos(this.player.heading);
    }
    speed *= Math.pow(p.airFriction, dt * 60);
    if (speed > maxSpeed) speed = maxSpeed;

    body.setLinvel({ x: dirX * speed, y: velocity.y, z: dirZ * speed }, true);
    this.player.state = PlayerState.Airborne;
  }
}
