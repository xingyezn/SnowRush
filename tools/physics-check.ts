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
import { ScoreSystem } from '../src/systems/ScoreSystem';
import {
  evaluateLanding,
  recognizeTricks,
  TrickSystem,
  type LandingResult,
} from '../src/systems/TrickSystem';
import { buildHeightFieldData } from '../src/world/HeightFieldData';
import { CourseGenerator } from '../src/world/CourseGenerator';
import { createFallbackLibrary } from '../src/world/ModelLibrary';
import { JumpRampField } from '../src/world/JumpRamp';
import { courseCenterX, terrainHeight } from '../src/world/TerrainHeight';

class ScriptedInput implements InputState {
  private readonly down = new Set<InputAction>();
  private readonly pressed = new Set<InputAction>();
  set(action: InputAction, value: boolean): void {
    if (value && !this.down.has(action)) this.pressed.add(action);
    if (value) this.down.add(action);
    else this.down.delete(action);
  }
  isDown(action: InputAction): boolean {
    return this.down.has(action);
  }
  wasPressed(action: InputAction): boolean {
    return this.pressed.has(action);
  }
  clearPressed(): void {
    this.pressed.clear();
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
  const controller = new PlayerController(player, input);
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

// --- Scenario 4: jump + air rotation ----------------------------------------
{
  const { physics, player, controller, input } = createRig();
  // Settle onto the slope.
  for (let i = 0; i < 300; i++) {
    controller.update(dt);
    physics.step();
    input.clearPressed();
    if (i > 30 && player.grounded) break;
  }

  // Tap jump; retry across a few steps since the board can skip on a crest.
  let jumped = false;
  for (let attempt = 0; attempt < 40 && !jumped; attempt++) {
    const beforeY = player.body.translation().y;
    input.set('jump', true);
    controller.update(dt);
    physics.step();
    input.clearPressed();
    input.set('jump', false);
    if (player.body.translation().y > beforeY + 0.05) jumped = true;
  }

  let airborneSteps = 0;
  let maxPitch = 0;
  input.set('brake', true); // hold S = backflip
  for (let i = 0; i < 150; i++) {
    controller.update(dt);
    physics.step();
    input.clearPressed();
    if (!player.grounded) airborneSteps++;
    maxPitch = Math.max(maxPitch, player.airRotationX);
  }
  input.set('brake', false);

  console.log('--- jump ---');
  check('Space jump leaves the ground', jumped, `jumped=${jumped}`);
  check('airtime is enough for tricks', airborneSteps > 20, `airborne ${airborneSteps} steps`);
  check('backflip accumulates rotation', maxPitch > 3, `airRotationX ${maxPitch.toFixed(2)} rad`);
}

// --- Scenario 5: ramp launch ------------------------------------------------
{
  const { physics, player, controller, input } = createRig();
  const scene = new THREE.Scene();
  const spawnZ = CONFIG.terrain.length / 2 - CONFIG.terrain.startOffsetZ;
  new JumpRampField(physics, scene, [{ x: 0, z: spawnZ - 60 }]);

  let maxUpVelocity = 0;
  let leftGround = false;
  for (let i = 0; i < 900; i++) {
    input.set('accelerate', true);
    controller.update(dt);
    physics.step();
    input.clearPressed();
    const vy = player.body.linvel().y;
    if (!player.grounded && vy > 1) {
      leftGround = true;
      maxUpVelocity = Math.max(maxUpVelocity, vy);
    }
    if (leftGround && player.grounded) break;
  }

  console.log('--- ramp ---');
  check(
    'ramp launches the player',
    leftGround && maxUpVelocity > 2,
    `max upward velocity ${maxUpVelocity.toFixed(2)} m/s`,
  );
}

// --- Scenario 6: trick recognition + landing --------------------------------
{
  const { physics, player, controller, input } = createRig();
  for (let i = 0; i < 300; i++) {
    controller.update(dt);
    physics.step();
    input.clearPressed();
    if (i > 30 && player.grounded) break;
  }

  const landings: LandingResult[] = [];
  const trickSystem = new TrickSystem(player, { onLanded: (r) => landings.push(r) });

  let jumped = false;
  for (let attempt = 0; attempt < 40 && !jumped; attempt++) {
    const beforeY = player.body.translation().y;
    input.set('jump', true);
    controller.update(dt);
    physics.step();
    input.clearPressed();
    input.set('jump', false);
    if (player.body.translation().y > beforeY + 0.05) jumped = true;
  }

  input.set('brake', true); // hold S = backflip
  for (let i = 0; i < 220 && landings.length === 0; i++) {
    controller.update(dt);
    physics.step();
    input.clearPressed();
    trickSystem.update();
  }
  input.set('brake', false);

  const result = landings[0];
  console.log('--- trick ---');
  check(
    'backflip recognised',
    !!result && result.tricks.some((t) => t.name === 'Backflip'),
    result ? result.tricks.map((t) => t.name).join(' + ') || 'no trick' : 'no landing',
  );
  check(
    'landing evaluated',
    !!result && result.quality === 'safe',
    result ? `${result.quality} at ${result.landingAngle.toFixed(1)} deg` : 'no landing',
  );
}

// --- Scenario 7: trick recognition table ------------------------------------
{
  const TAU = Math.PI * 2;
  const cases: Array<[number, number, string]> = [
    [-TAU, 0, 'Frontflip'],
    [TAU, 0, 'Backflip'],
    [-2 * TAU, 0, 'Double Frontflip'],
    [2 * TAU, 0, 'Double Backflip'],
    [0, TAU, '360'],
    [0, 2 * TAU, '720'],
    [0, 3 * TAU, '1080'],
    [TAU, TAU, 'Backflip+360'],
    [0, 0, ''],
  ];
  console.log('--- tricks ---');
  for (const [pitch, yaw, expected] of cases) {
    const names = recognizeTricks(pitch, yaw)
      .map((t) => t.name)
      .join('+');
    check(`recognise ${expected || 'nothing'}`, names === expected, names || 'nothing');
  }

  const deg = (d: number) => (d * Math.PI) / 180;
  check('safe landing', evaluateLanding(deg(10), 0).quality === 'safe', `${evaluateLanding(deg(10), 0).angle.toFixed(0)} deg`);
  check('hard landing', evaluateLanding(deg(45), 0).quality === 'hard', `${evaluateLanding(deg(45), 0).angle.toFixed(0)} deg`);
  check('crash landing', evaluateLanding(deg(80), 0).quality === 'crash', `${evaluateLanding(deg(80), 0).angle.toFixed(0)} deg`);
}

// --- Scenario 8: trick scoring + combo --------------------------------------
{
  const score = new ScoreSystem();
  const first = score.addTrick(500);
  const second = score.addTrick(300);
  const third = score.addTrick(500);
  console.log('--- scoring ---');
  check('first trick is x1', first.multiplier === 1 && first.points === 500, `${first.points} @ x${first.multiplier}`);
  check('combo multiplier grows', second.multiplier === 1.2, `x${second.multiplier}`);
  check('score accumulates', score.getScore() === 1610, `${score.getScore()}`);
  check('max combo tracked', score.getMaxCombo() === 3, `x${score.getMaxCombo()}`);
  score.resetCombo();
  const afterCrash = score.addTrick(500);
  check('crash resets combo', afterCrash.multiplier === 1, `x${afterCrash.multiplier}`);
}

// --- Scenario 9: course structure -------------------------------------------
{
  const physics = new PhysicsWorld(CONFIG.world.gravity);
  physics.setFixedStep(dt);
  const scene = new THREE.Scene();
  const course = new CourseGenerator(physics, scene, createFallbackLibrary());

  const t = CONFIG.terrain;
  const halfWidth = t.playWidth / 2;
  const all = [
    ...course.trees.placements,
    ...course.rocks.placements,
    ...course.gates.gates,
    ...course.ramps.placements,
    ...course.checkpoints.checkpoints,
    course.finish.placement,
  ];
  const inBounds = all.every(
    (p) => Math.abs(p.x - courseCenterX(p.z)) <= halfWidth + 1 && Math.abs(p.z) <= t.length / 2,
  );
  const distinctZ = new Set(course.trees.placements.map((p) => Math.round(p.z))).size;

  console.log('--- course ---');
  check('course has trees', course.trees.placements.length >= 100, `${course.trees.placements.length} trees`);
  check('course has rocks', course.rocks.placements.length >= 20, `${course.rocks.placements.length} rocks`);
  check('course has gates', course.gates.gates.length >= 5, `${course.gates.gates.length} gates`);
  check('course has ramps', course.ramps.placements.length >= 4, `${course.ramps.placements.length} ramps`);
  check(
    'course has checkpoints',
    course.checkpoints.checkpoints.length >= 3,
    `${course.checkpoints.checkpoints.length} checkpoints`,
  );
  check('objects stay in bounds', inBounds, `${all.length} objects, ${distinctZ} distinct tree rows`);
  check(
    'finish is near the end',
    course.finish.placement.z < course.startZ - 2000,
    `finish z=${course.finish.placement.z.toFixed(0)} (start ${course.startZ})`,
  );
  check(
    'colliders match placements',
    physics.countByKind('tree') === course.trees.placements.length &&
      physics.countByKind('rock') === course.rocks.placements.length &&
      physics.countByKind('gate') === course.gates.gates.length &&
      physics.countByKind('ramp') === course.ramps.placements.length &&
      physics.countByKind('checkpoint') === course.checkpoints.checkpoints.length &&
      physics.countByKind('finish') === 1,
    `tree=${physics.countByKind('tree')} rock=${physics.countByKind('rock')} ` +
      `gate=${physics.countByKind('gate')} ramp=${physics.countByKind('ramp')} ` +
      `checkpoint=${physics.countByKind('checkpoint')} finish=${physics.countByKind('finish')}`,
  );
}

console.log('---');
console.log(failures === 0 ? 'physics-check: all checks passed' : `physics-check: ${failures} check(s) failed`);
const exitCode = failures === 0 ? 0 : 1;
(globalThis as { process?: { exitCode?: number } }).process!.exitCode = exitCode;
