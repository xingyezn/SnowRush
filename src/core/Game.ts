import * as THREE from 'three';
import { CONFIG } from './Config';
import { GameState } from './GameState';
import { GameLoop } from './GameLoop';
import { InputManager } from './InputManager';
import { Renderer } from './Renderer';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { Lighting } from '../world/Lighting';
import { Terrain } from '../world/Terrain';
import { terrainHeight } from '../world/TerrainHeight';
import { Player, type SpawnPoint } from '../player/Player';
import { PlayerController } from '../player/PlayerController';
import { PlayerVisual } from '../player/PlayerVisual';
import { FollowCamera } from '../camera/FollowCamera';
import { HUD } from '../ui/HUD';

/**
 * Orchestrator: creates systems, owns GameState and schedules updates.
 * Contains no terrain / player / camera algorithms itself.
 */
export class Game {
  private readonly renderer: Renderer;
  private readonly lighting: Lighting;
  private readonly physics: PhysicsWorld;
  private readonly terrain: Terrain;
  private readonly player: Player;
  private readonly playerController: PlayerController;
  private readonly playerVisual: PlayerVisual;
  private readonly followCamera: FollowCamera;
  private readonly hud: HUD;
  private readonly input: InputManager;
  private readonly loop: GameLoop;

  private readonly playerPosition = new THREE.Vector3();
  private state: GameState = GameState.Loading;

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container);
    this.lighting = new Lighting(this.renderer.scene);
    this.input = new InputManager();

    this.physics = new PhysicsWorld(CONFIG.world.gravity);
    this.physics.setFixedStep(CONFIG.world.fixedStep);

    this.terrain = new Terrain(this.physics, this.renderer.scene);
    this.player = new Player(this.physics, this.createSpawnPoint());

    this.playerVisual = new PlayerVisual();
    this.renderer.scene.add(this.playerVisual.group);

    this.playerController = new PlayerController(this.player, this.input, this.physics);
    this.followCamera = new FollowCamera(this.renderer.camera);
    this.hud = new HUD(container);

    this.loop = new GameLoop(
      CONFIG.world.fixedStep,
      CONFIG.world.maxSubSteps,
      CONFIG.world.maxFrameDelta,
      this.fixedUpdate,
      this.renderUpdate,
    );
  }

  init(): void {
    // V0.1 starts straight in Playing; MENU / COUNTDOWN arrive in later stages.
    this.state = GameState.Playing;
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

  private readonly fixedUpdate = (dt: number): void => {
    if (this.state !== GameState.Playing) return;
    this.playerController.update(dt);
    this.physics.step();
  };

  private readonly renderUpdate = (dt: number): void => {
    const position = this.player.getPosition(this.playerPosition);

    if (this.state === GameState.Playing) this.checkOutOfBounds(position);

    this.playerVisual.sync(position, this.player.heading);
    this.followCamera.update(position, this.player.heading, this.player.getSpeed(), dt);
    this.lighting.update(position);
    this.hud.update(this.player);
    this.renderer.render();
    this.input.update();
  };

  /** Safety net so a run cannot be lost by sliding off the world in V0.1. */
  private checkOutOfBounds(position: THREE.Vector3): void {
    const ground = terrainHeight(position.x, position.z);
    if (position.y < ground - CONFIG.player.fallResetDepth) {
      this.player.respawn();
    }
  }
}
