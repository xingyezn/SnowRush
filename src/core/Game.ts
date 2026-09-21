import * as THREE from 'three';
import { CONFIG } from './Config';
import { GameState } from './GameState';
import { GameLoop } from './GameLoop';
import { InputManager } from './InputManager';
import { Renderer } from './Renderer';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { Lighting } from '../world/Lighting';
import { Terrain } from '../world/Terrain';
import { Boundary } from '../world/Boundary';
import { CourseGenerator } from '../world/CourseGenerator';
import { terrainHeight } from '../world/TerrainHeight';
import { Player, type SpawnPoint } from '../player/Player';
import { PlayerController } from '../player/PlayerController';
import { PlayerVisual } from '../player/PlayerVisual';
import { SnowEffects } from '../effects/SnowEffects';
import { FollowCamera } from '../camera/FollowCamera';
import { HUD } from '../ui/HUD';
import { TrickHUD } from '../ui/TrickHUD';
import { ResultScreen } from '../ui/ResultScreen';
import { CollisionSystem } from '../systems/CollisionSystem';
import { CheckpointSystem } from '../systems/CheckpointSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { Timer } from '../systems/Timer';
import { TrickSystem, type LandingResult } from '../systems/TrickSystem';

/**
 * Orchestrator: creates systems, owns GameState and schedules updates.
 * Contains no terrain / player / camera algorithms itself.
 */
export class Game {
  private readonly renderer: Renderer;
  private readonly lighting: Lighting;
  private readonly physics: PhysicsWorld;
  private readonly terrain: Terrain;
  readonly boundary: Boundary;
  readonly course: CourseGenerator;
  private readonly player: Player;
  private readonly playerController: PlayerController;
  private readonly playerVisual: PlayerVisual;
  private readonly snowEffects: SnowEffects;
  private readonly followCamera: FollowCamera;
  private readonly hud: HUD;
  private readonly trickHud: TrickHUD;
  private readonly resultScreen: ResultScreen;
  private readonly input: InputManager;
  private readonly loop: GameLoop;
  private readonly collisionSystem: CollisionSystem;
  private readonly checkpointSystem: CheckpointSystem;
  private readonly trickSystem: TrickSystem;
  private readonly scoreSystem = new ScoreSystem();
  private readonly timer = new Timer();
  private readonly startSpawn: SpawnPoint;

  private readonly playerPosition = new THREE.Vector3();
  private state: GameState = GameState.Loading;
  private crashTimer = 0;
  private crashElapsed = 0;
  private countdownRemaining = 0;
  private maxSpeedKmh = 0;

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container);
    this.lighting = new Lighting(this.renderer.scene);
    this.input = new InputManager();

    this.physics = new PhysicsWorld(CONFIG.world.gravity);
    this.physics.setFixedStep(CONFIG.world.fixedStep);

    this.terrain = new Terrain(this.physics, this.renderer.scene);
    this.boundary = new Boundary(this.physics, this.renderer.scene);
    this.course = new CourseGenerator(this.physics, this.renderer.scene);
    this.player = new Player(this.physics, this.createSpawnPoint());
    this.startSpawn = { ...this.player.spawn };

    this.playerVisual = new PlayerVisual();
    this.renderer.scene.add(this.playerVisual.group);
    this.snowEffects = new SnowEffects(this.renderer.scene);

    this.playerController = new PlayerController(this.player, this.input);
    this.followCamera = new FollowCamera(this.renderer.camera, this.course.occluders);
    this.hud = new HUD(container);
    this.trickHud = new TrickHUD(container);
    this.resultScreen = new ResultScreen(container);

    this.checkpointSystem = new CheckpointSystem(this.player, this.startSpawn);
    this.trickSystem = new TrickSystem(this.player, { onLanded: this.handleLanded });
    this.collisionSystem = new CollisionSystem(this.physics, this.course, {
      onCrash: this.handleCrash,
      onGate: this.handleGate,
      onCheckpoint: this.handleCheckpoint,
      onFinish: this.handleFinish,
    });

    this.loop = new GameLoop(
      CONFIG.world.fixedStep,
      CONFIG.world.maxSubSteps,
      CONFIG.world.maxFrameDelta,
      this.fixedUpdate,
      this.renderUpdate,
    );
  }

  init(): void {
    this.beginRun();
  }

  start(): void {
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
  }

  dispose(): void {
    this.stop();
    this.renderer.scene.remove(this.terrain.mesh);
    this.input.dispose();
    this.renderer.dispose();
  }

  private createSpawnPoint(): SpawnPoint {
    const t = CONFIG.terrain;
    const p = CONFIG.player;
    const x = 0;
    const z = t.length / 2 - t.startOffsetZ;
    const y = terrainHeight(x, z) + p.capsuleHalfHeight + p.capsuleRadius + 0.3;
    return { x, y, z, heading: 0 };
  }

  /** Starts (or restarts) a run: reset stats, respawn, then count down. */
  private readonly beginRun = (): void => {
    this.course.reset();
    this.scoreSystem.reset();
    this.timer.reset();
    this.maxSpeedKmh = 0;
    this.crashTimer = 0;
    this.crashElapsed = 0;
    this.checkpointSystem.reset(this.startSpawn);
    this.player.setSpawn(this.startSpawn);
    this.player.respawn();
    this.resultScreen.hide();
    this.trickHud.clear();
    this.hud.clearMessage();
    this.countdownRemaining = CONFIG.timer.countdownSeconds;
    this.state = GameState.Countdown;
  };

  private readonly handleCrash = (): void => {
    if (this.state !== GameState.Playing) return;
    this.state = GameState.Crashed;
    this.crashTimer = CONFIG.crash.respawnDelay;
    this.crashElapsed = 0;
    this.trickSystem.cancel();
    this.scoreSystem.resetCombo();
    this.trickHud.clear();
    this.player.crash();
    this.followCamera.addShake(CONFIG.camera.crashShake);
    this.hud.setMessage('CRASHED');
  };

  private readonly handleLanded = (result: LandingResult): void => {
    if (this.state !== GameState.Playing) return;
    if (result.quality === 'crash') {
      this.handleCrash();
      return;
    }
    if (result.tricks.length === 0) return;

    const baseScore =
      result.quality === 'hard'
        ? Math.round(result.baseScore * CONFIG.trick.hardLandingScoreFactor)
        : result.baseScore;
    const award = this.scoreSystem.addTrick(baseScore);
    this.trickHud.show(result.tricks, award.points, award.multiplier);
  };

  private readonly handleGate = (): void => {
    this.scoreSystem.addGate();
  };

  private readonly handleCheckpoint = (index: number): void => {
    this.checkpointSystem.setCheckpoint(index, this.course.checkpoints.checkpoints[index]);
    this.hud.setMessage('CHECKPOINT');
  };

  private readonly handleFinish = (): void => {
    if (this.state !== GameState.Playing) return;
    this.state = GameState.Finished;
    this.timer.stop();
    this.hud.clearMessage();
    this.resultScreen.show(
      {
        time: this.timer.format(),
        score: this.scoreSystem.getScore(),
        maxSpeedKmh: this.maxSpeedKmh,
        gates: this.scoreSystem.getGateCount(),
        tricks: this.scoreSystem.getTrickCount(),
        maxCombo: this.scoreSystem.getMaxCombo(),
      },
      this.beginRun,
    );
  };

  private respawn(): void {
    this.checkpointSystem.respawnPlayer();
    this.state = GameState.Playing;
    this.crashTimer = 0;
    this.crashElapsed = 0;
    this.hud.clearMessage();
  }

  private togglePause(): void {
    if (this.state === GameState.Paused) {
      this.state = GameState.Playing;
      this.timer.start();
      this.hud.clearMessage();
    } else {
      this.state = GameState.Paused;
      this.timer.stop();
      this.hud.setMessage('PAUSED');
    }
  }

  private readonly fixedUpdate = (dt: number): void => {
    if (this.state === GameState.Playing) {
      this.playerController.update(dt);
      this.physics.step();
      this.collisionSystem.update();
      this.trickSystem.update();
      this.timer.update(dt);
      return;
    }

    if (this.state === GameState.Crashed) {
      this.physics.step();
      this.crashElapsed += dt;
      this.crashTimer -= dt;
      if (this.crashTimer <= 0) this.respawn();
      return;
    }

    if (this.state === GameState.Countdown) {
      this.physics.step();
      this.countdownRemaining -= dt;
      if (this.countdownRemaining <= -0.6) {
        this.state = GameState.Playing;
        this.timer.start();
        this.hud.clearMessage();
      }
    }
  };

  private readonly renderUpdate = (dt: number): void => {
    const position = this.player.getPosition(this.playerPosition);

    if (
      this.input.wasPressed('pause') &&
      (this.state === GameState.Playing || this.state === GameState.Paused)
    ) {
      this.togglePause();
    }

    if (
      this.input.wasPressed('reset') &&
      (this.state === GameState.Playing || this.state === GameState.Crashed)
    ) {
      this.respawn();
    }

    if (this.state === GameState.Playing) {
      this.checkOutOfBounds(position);
      this.maxSpeedKmh = Math.max(this.maxSpeedKmh, this.player.getSpeedKmh());
    }

    if (this.state === GameState.Countdown) {
      this.hud.setMessage(
        this.countdownRemaining > 0 ? String(Math.ceil(this.countdownRemaining)) : 'GO!',
      );
    }

    const tilt =
      this.state === GameState.Crashed
        ? Math.min(this.crashElapsed * CONFIG.crash.tiltSpeed, 1.5)
        : 0;

    this.playerVisual.sync(
      position,
      this.player.heading,
      tilt,
      this.player.airRotationX,
      this.player.airRotationZ,
      this.player.lean,
    );
    const landing = this.snowEffects.update(dt, this.player);
    if (landing.landed) {
      this.followCamera.addShake(landing.strength * CONFIG.camera.landingShakeScale);
    }
    this.followCamera.update(
      position,
      this.player.heading,
      this.player.getSpeed(),
      dt,
      this.player.grounded,
    );
    this.lighting.update(position);
    this.hud.update(this.player);
    this.hud.setScore(this.scoreSystem.getScore());
    this.hud.setTime(this.timer.format());
    this.renderer.render();
    this.input.update();
  };

  /** Safety net so a run cannot be lost by sliding off the world. */
  private checkOutOfBounds(position: THREE.Vector3): void {
    const ground = terrainHeight(position.x, position.z);
    if (position.y < ground - CONFIG.player.fallResetDepth) {
      this.respawn();
    }
  }
}
