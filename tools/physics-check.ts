/**
 * Headless physics regression check.
 *
 * Builds the same heightfield the game uses and drives PlayerController with a
 * scripted "autopilot" input, then asserts the V0.1 acceptance criteria that do
 * not require a browser (continuous glide, no terrain penetration, W/S effect,
 * carved turning).
 *
 * Run with: npm run test:physics
 */
import * as RAPIER from '@dimforge/rapier3d';
import * as THREE from 'three';
import { CONFIG } from '../src/core/Config';
import type { InputAction, InputState } from '../src/core/InputManager';
import { PhysicsWorld } from '../src/physics/PhysicsWorld';
import { Player } from '../src/player/Player';
import { PlayerController } from '../src/player/PlayerController';
import { buildHeightFieldData } from '../src/world/HeightFieldData';
import { terrainHeight } from '../src/world/TerrainHeight';

class ScriptedInput implements InputState {
  private readonly down = new Set<InputAction>();
  set(action: InputAction, value: boolean): void {
    if (value) this.down.add(action);
    else this.down.delete(action);
  }
  isDown(action: InputAction): boolean {
    return this.down.has(action);
  }
}

interface Rig {
  physics: PhysicsWorld;
  player: Player;
  controller: PlayerController;
  input: ScriptedInput;
  spawnZ: number;
}

function createRig(): Rig {
  const physics = new PhysicsWorld(CONFIG.world.gravity);
  physics.setFixedStep(CONFIG.world.fixedStep);

  const data = buildHeightFieldData();
  const ground = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  physics.world.createCollider(
    RAPIER.ColliderDesc.heightfield(data.nrows, data.ncols, data.heights, data.scale),
    ground,
  );

  const t = CONFIG.terrain;
  const halfWidth = t.width / 2;
  for (const side of [-1, 1]) {
    const wallBody = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(side * (halfWidth + t.wallThickness), 0, 0),
    );
    physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid(t.wallThickness, t.wallHalfHeight, t.length / 2),
      wallBody,
    );
  }

  const p = CONFIG.player;
  const spawnZ = t.length / 2 - t.startOffsetZ;
  const spawn = {
    x: 0,
    y: terrainHeight(0, spawnZ) + p.capsuleHalfHeight + p.capsuleRadius + 0.3,
    z: spawnZ,
    heading: 0,
  };

  const input = new ScriptedInput();
  const player = new Player(physics, spawn);
  const controller = new PlayerController(player, input, physics);
  return { physics, player, controller, input, spawnZ };
}

const dt = CONFIG.world.fixedStep;
let failures = 0;

function check(label: string, condition: boolean, detail: string): void {
  if (!condition) failures++;
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${label} — ${detail}`);
}

// --- Scenario 1: a full 90 second run with accelerate / brake windows -------
{
  const { physics, player, controller, input, spawnZ } = createRig();
  const seconds = 90;
  const steps = Math.round(seconds / dt);
  const pos = new THREE.Vector3();

  let groundedSteps = 0;
  let maxPenetration = 0;
  let maxSpeed = 0;
  let minSpeedDuringBrake = Infinity;
  let resets = 0;
  let maxX = 0;

  for (let step = 0; step < steps; step++) {
    const time = step * dt;
    const headingError = pos.x * 0.03 - player.heading;
    input.set('left', headingError > 0.03);
    input.set('right', headingError < -0.03);
    input.set('accelerate', time >= 20 && time < 30);
    input.set('brake', time >= 45 && time < 50);

    controller.update(dt);
    physics.step();
    player.getPosition(pos);

    if (player.grounded) groundedSteps++;
    const clearance = pos.y - terrainHeight(pos.x, pos.z);
    if (clearance < 0) maxPenetration = Math.max(maxPenetration, -clearance);
    if (pos.y < terrainHeight(pos.x, pos.z) - CONFIG.player.fallResetDepth) {
      player.respawn();
      resets++;
    }
    maxSpeed = Math.max(maxSpeed, player.getSpeed());
    if (time >= 45 && time < 50) minSpeedDuringBrake = Math.min(minSpeedDuringBrake, player.getSpeed());
    maxX = Math.max(maxX, Math.abs(pos.x));
  }

  const travelled = spawnZ - pos.z;
  console.log('--- 90s run ---');
  check('continuous glide', travelled > 500, `travelled ${travelled.toFixed(0)}m`);
  check('stays grounded', groundedSteps / steps >= 0.9, `${((groundedSteps / steps) * 100).toFixed(1)}% grounded`);
  check('no terrain penetration', maxPenetration <= 0.05, `max penetration ${maxPenetration.toFixed(3)}m`);
  check('no fall-through reset', resets === 0, `resets ${resets}`);
  check('W accelerates', maxSpeed >= 28, `max speed ${maxSpeed.toFixed(1)}m/s (${(maxSpeed * 3.6).toFixed(0)}km/h)`);
  check('S brakes', minSpeedDuringBrake <= 6, `min brake speed ${minSpeedDuringBrake.toFixed(1)}m/s`);
  check('stays on course', maxX <= CONFIG.terrain.width / 2, `max |x| ${maxX.toFixed(1)}m`);
}

// --- Scenario 2: hold a turn and confirm the path is a carved arc -----------
{
  const { physics, player, controller, input, spawnZ } = createRig();
  const pos = new THREE.Vector3();
  const startHeading = player.heading;
  let minZ = spawnZ;
  let maxAbsX = 0;

  const steps = Math.round(8 / dt);
  for (let step = 0; step < steps; step++) {
    const time = step * dt;
    input.set('right', time >= 5);
    controller.update(dt);
    physics.step();
    player.getPosition(pos);
    minZ = Math.min(minZ, pos.z);
    maxAbsX = Math.max(maxAbsX, Math.abs(pos.x));
  }

  const headingChange = Math.abs(player.heading - startHeading);
  const cameBackUphill = pos.z - minZ;
  const endVelocity = player.getVelocity(new THREE.Vector3());
  console.log('--- 3s carve ---');
  check('turn changes heading', headingChange >= 1, `heading changed ${headingChange.toFixed(2)} rad`);
  check('turn moves laterally', maxAbsX >= 5, `max |x| ${maxAbsX.toFixed(1)}m`);
  // After >90 degrees of carve the board points back uphill: proof of an arc,
  // not a straight sideways slide.
  check(
    'path is a curved arc',
    endVelocity.z > 0 && cameBackUphill >= 0.3,
    `end vz ${endVelocity.z.toFixed(2)}m/s, z recovered ${cameBackUphill.toFixed(1)}m`,
  );
}

// --- Scenario 3: a sustained carve must not scrub all the speed -------------
{
  const { physics, player, controller, input } = createRig();

  let step = 0;
  while (step < Math.round(30 / dt) && player.getSpeed() < 22) {
    input.set('accelerate', true);
    controller.update(dt);
    physics.step();
    step++;
  }
  const startSpeed = player.getSpeed();
  const startHeading = player.heading;
  let minSpeed = startSpeed;

  for (let i = 0; i < Math.round(2 / dt); i++) {
    input.set('accelerate', true);
    input.set('right', true);
    controller.update(dt);
    physics.step();
    minSpeed = Math.min(minSpeed, player.getSpeed());
  }

  const headingChange = Math.abs(player.heading - startHeading);
  const retention = minSpeed / startSpeed;
  console.log('--- 2s carve (holding W) ---');
  check(
    'carve keeps speed',
    retention >= 0.75,
    `retained ${(retention * 100).toFixed(0)}% of ${startSpeed.toFixed(1)}m/s`,
  );
  check('carve turns the board', headingChange >= 1.2, `heading changed ${headingChange.toFixed(2)} rad`);
}

console.log('---');
console.log(failures === 0 ? 'physics-check: all checks passed' : `physics-check: ${failures} check(s) failed`);
const exitCode = failures === 0 ? 0 : 1;
(globalThis as { process?: { exitCode?: number } }).process!.exitCode = exitCode;
