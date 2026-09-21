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
import { MountainBackdrop } from '../world/MountainBackdrop';
import { CourseGenerator } from '../world/CourseGenerator';
import type { ModelLibrary } from '../world/ModelLibrary';
import { terrainHeight } from '../world/TerrainHeight';
import { Player, type SpawnPoint } from '../player/Player';
import { PlayerController } from '../player/PlayerController';
import { PlayerVisual, type RiderAnimation } from '../player/PlayerVisual';
import { SnowEffects } from '../effects/SnowEffects';
import { FollowCamera } from '../camera/FollowCamera';
import { HUD } from '../ui/HUD';
import { TrickHUD } from '../ui/TrickHUD';
import { StartMenu } from '../ui/StartMenu';
import { PauseMenu } from '../ui/PauseMenu';
import { ResultScreen } from '../ui/ResultScreen';
import { CollisionSystem } from '../systems/CollisionSystem';
import { CheckpointSystem } from '../systems/CheckpointSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { Timer } from '../systems/Timer';
import { AudioSystem } from '../systems/AudioSystem';
import { TrickSystem, type LandingResult } from '../systems/TrickSystem';

/**
 * Orchestrator: creates systems, owns GameState and schedules updates.
 * Contains no terrain / player / camera algorithms itself.
 */
export class Game {
  private static readonly BEST_SCORE_KEY = 'SnowRush.best';

  private readonly renderer: Renderer;
  private readonly lighting: Lighting;
  private readonly physics: PhysicsWorld;
  readonly terrain: Terrain;
  readonly boundary: Boundary;
  readonly course: CourseGenerator;
  private readonly player: Player;
  private readonly playerController: PlayerController;
  private readonly playerVisual: PlayerVisual;
  private readonly snowEffects: SnowEffects;
  private readonly followCamera: FollowCamera;
  private readonly hud: HUD;
  private readonly trickHud: TrickHUD;
  private readonly startMenu: StartMenu;
  private readonly pauseMenu: PauseMenu;
  private readonly resultScreen: ResultScreen;
  private readonly input: InputManager;
  private readonly loop: GameLoop;
  private readonly collisionSystem: CollisionSystem;
  private readonly checkpointSystem: CheckpointSystem;
  private readonly trickSystem: TrickSystem;
  private readonly audio = new AudioSystem();
  private readonly scoreSystem = new ScoreSystem();
  private readonly timer = new Timer();
  private readonly startSpawn: SpawnPoint;

  private readonly playerPosition = new THREE.Vector3();
  private state: GameState = GameState.Loading;
  private crashTimer = 0;
  private crashElapsed = 0;
  private countdownRemaining = 0;
  private maxSpeedKmh = 0;
  private wasGrounded = true;

  constructor(container: HTMLElement, models: ModelLibrary) {
    this.renderer = new Renderer(container);
    this.lighting = new Lighting(this.renderer.scene);
    this.input = new InputManager();

    this.physics = new PhysicsWorld(CONFIG.world.gravity);
    this.physics.setFixedStep(CONFIG.world.fixedStep);

    this.terrain = new Terrain(this.physics, this.renderer.scene);
    this.boundary = new Boundary(this.physics, this.renderer.scene);
    new MountainBackdrop(this.renderer.scene);
    this.course = new CourseGenerator(this.physics, this.renderer.scene, models);
    this.player = new Player(this.physics, this.createSpawnPoint());
    this.startSpawn = { ...this.player.spawn };

    this.playerVisual = new PlayerVisual(models.rider);
    this.renderer.scene.add(this.playerVisual.group);
    this.snowEffects = new SnowEffects(this.renderer.scene);

    this.playerController = new PlayerController(this.player, this.input);
    this.followCamera = new FollowCamera(this.renderer.camera, this.course.occluders);
    this.hud = new HUD(container);
    this.hud.onPause(() => this.togglePause());
    this.trickHud = new TrickHUD(container);
    this.startMenu = new StartMenu(container);
    this.pauseMenu = new PauseMenu(container);
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
    this.state = GameState.Menu;
    this.startMenu.show(this.loadBestScore(), () => {
      this.audio.unlock();
      this.startMenu.hide();
      this.beginRun();
    });
  }

  private loadBestScore(): number {
    try {
      return Number(window.localStorage.getItem(Game.BEST_SCORE_KEY) ?? 0) || 0;
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      if (score > this.loadBestScore()) {
        window.localStorage.setItem(Game.BEST_SCORE_KEY, String(score));
      }
    } catch {
      // localStorage can be unavailable (private mode); ignore.
    }
  }

  start(): void {
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
  }

  dispose(): void {
    this.stop();
    this.input.dispose();

    // Release every GPU resource owned by the scene (meshes, instanced meshes,
    // particle points and their materials).
    this.renderer.scene.traverse((object) => {
      const renderable = object as THREE.Mesh;
      if (renderable.geometry) renderable.geometry.dispose();
      const material = renderable.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) {
        for (const entry of material) entry.dispose();
      } else if (material) {
        material.dispose();
      }
    });

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
    this.startMenu.hide();
    this.pauseMenu.hide();
    this.resultScreen.hide();
    this.trickHud.clear();
    this.hud.clearMessage();
    this.hud.showHint();
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
    this.audio.playCrash();
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
    this.audio.playCombo(this.scoreSystem.getComboStreak());
  };

  private readonly handleGate = (): void => {
    this.scoreSystem.addGate();
  };

  private readonly handleCheckpoint = (index: number): void => {
    this.checkpointSystem.setCheckpoint(index, this.course.checkpoints.checkpoints[index]);
    this.audio.playCheckpoint();
    this.hud.setMessage('CHECKPOINT');
  };

  private readonly handleFinish = (): void => {
    if (this.state !== GameState.Playing) return;
    this.state = GameState.Finished;
    this.timer.stop();
    this.hud.clearMessage();
    this.saveBestScore(this.scoreSystem.getScore());
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
    if (this.state !== GameState.Playing && this.state !== GameState.Paused) return;
    if (this.state === GameState.Paused) {
      this.state = GameState.Playing;
      this.timer.start();
      this.pauseMenu.hide();
    } else {
      this.state = GameState.Paused;
      this.timer.stop();
      this.pauseMenu.show(
        () => this.togglePause(),
        () => this.beginRun(),
      );
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

    const animation: RiderAnimation =
      this.state === GameState.Crashed ? 'death' : this.player.grounded ? 'idle' : 'jump';
    this.playerVisual.setAnimation(animation);
    this.playerVisual.update(dt);
    this.playerVisual.sync(
      position,
      this.player.heading,
      tilt,
      this.player.airRotationX,
      this.player.airRotationZ,
      this.player.lean,
    );
    const landing = this.snowEffects.update(dt, this.player);
    const grounded = this.player.grounded;
    if (!grounded && this.wasGrounded) this.audio.playJump();
    if (landing.landed) {
      this.followCamera.addShake(landing.strength * CONFIG.camera.landingShakeScale);
      this.audio.playLanding(landing.strength);
    }
    this.wasGrounded = grounded;
    this.audio.update(this.player.getSpeed(), grounded);
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
