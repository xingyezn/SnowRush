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
import { Clouds } from '../world/Clouds';
import { Balloons } from '../world/Balloons';
import { Sun } from '../world/Sun';
import { CourseGenerator } from '../world/CourseGenerator';
import type { CharacterOption, ModelLibrary } from '../world/ModelLibrary';
import { terrainHeight } from '../world/TerrainHeight';
import { Player, type SpawnPoint } from '../player/Player';
import { PlayerController } from '../player/PlayerController';
import { PlayerVisual, type PlayerAnimation } from '../player/PlayerVisual';
import { SnowEffects } from '../effects/SnowEffects';
import { FollowCamera } from '../camera/FollowCamera';
import { HUD } from '../ui/HUD';
import { TrickHUD } from '../ui/TrickHUD';
import { StartMenu } from '../ui/StartMenu';
import { AdminPanel, toAdminEntries } from '../ui/AdminPanel';
import { ScenePanel } from '../ui/ScenePanel';
import { currentSceneOverrides, saveSceneOverrides } from '../core/SceneOverrides';
import { clearPlayerConfig, savePlayerConfig as savePlayerConfigLocal } from '../core/PlayerConfig';
import { clearLocalModel, loadLocalModel, saveLocalModel } from '../core/LocalModelStore';
import { loadRiderFromUrl } from '../world/ModelLibrary';
import { PauseMenu } from '../ui/PauseMenu';
import { CrashMenu } from '../ui/CrashMenu';
import { ResultScreen } from '../ui/ResultScreen';
import { SettingsMenu } from '../ui/SettingsMenu';
import { Tutorial } from '../ui/Tutorial';
import { PhotoMode } from '../ui/PhotoMode';
import { t } from '../ui/I18n';
import {
  getSettings,
  onSettingsChange,
  updateSettings,
  type GameSettings,
  type GameMode,
  type QualityLevel,
  type ViewMode,
} from './Settings';
import { evaluateDaily } from './Daily';
import { prefersReducedMotion } from './Platform';
import { setUiSoundHandler } from '../ui/UiSound';
import { formatTime, getStats, recordRun } from './Stats';
import { evaluateAchievements } from './Achievements';
import { CollisionSystem } from '../systems/CollisionSystem';
import { CheckpointSystem } from '../systems/CheckpointSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { Timer } from '../systems/Timer';
import { AudioSystem } from '../systems/AudioSystem';
import { TrickSystem, type LandingResult } from '../systems/TrickSystem';
import { ItemSystem } from '../systems/ItemSystem';
import { itemColor, type ItemType } from '../world/Items';
import { PickupEffect } from '../effects/PickupEffect';
import { SnowTrack } from '../effects/SnowTrack';
import { Fireworks } from '../effects/Fireworks';
import {
  getCourseConfig,
  getTerrainConfig,
  getWorldExtras,
  randomCourse,
  randomTerrain,
  setWorldConfig,
  type CourseConfig,
  type TerrainConfig,
  type WorldExtras,
} from '../world/WorldConfig';

/**
 * Orchestrator: creates systems, owns GameState and schedules updates.
 * Contains no terrain / player / camera algorithms itself.
 */
export class Game {
  private static readonly BEST_SCORE_KEY = 'SnowRush.best';
  private static readonly CHARACTER_KEY = 'SnowRush.character';
  private static readonly DEFAULT_CHARACTER = 'panda';
  private static readonly SEEN_INTRO_KEY = 'SnowRush.seenIntro';
  private static readonly TUTORIAL_KEY = 'SnowRush.tutorialDone';

  private readonly renderer: Renderer;
  private readonly lighting: Lighting;
  private mountainBackdrop: MountainBackdrop;
  private clouds: Clouds;
  private balloons: Balloons;
  private readonly sun: Sun;
  private readonly physics: PhysicsWorld;
  terrain: Terrain;
  boundary: Boundary;
  course: CourseGenerator;
  private readonly player: Player;
  private readonly playerController: PlayerController;
  private readonly playerVisual: PlayerVisual;
  private readonly snowEffects: SnowEffects;
  private readonly pickupEffect: PickupEffect;
  private readonly snowTrack: SnowTrack;
  private readonly fireworks: Fireworks;
  private followCamera: FollowCamera;
  private readonly models: ModelLibrary;
  private itemSystem: ItemSystem | null = null;
  private worldKey = '';
  private readonly hud: HUD;
  private readonly trickHud: TrickHUD;
  private readonly startMenu: StartMenu;
  private readonly pauseMenu: PauseMenu;
  private readonly crashMenu: CrashMenu;
  private readonly resultScreen: ResultScreen;
  private crashMenuShown = false;
  private readonly settingsMenu: SettingsMenu;
  private readonly tutorial: Tutorial;
  private readonly photoMode: PhotoMode;
  private readonly input: InputManager;
  private readonly loop: GameLoop;
  private collisionSystem: CollisionSystem;
  private checkpointSystem: CheckpointSystem;
  private readonly trickSystem: TrickSystem;
  private readonly audio = new AudioSystem();
  private readonly scoreSystem = new ScoreSystem();
  private readonly timer = new Timer();
  private startSpawn: SpawnPoint;
  private readonly characters: CharacterOption[];
  private selectedCharacterId: string;

  private readonly playerPosition = new THREE.Vector3();
  private state: GameState = GameState.Loading;
  private crashTimer = 0;
  private crashElapsed = 0;
  private countdownRemaining = 0;
  private maxSpeedKmh = 0;
  private wasGrounded = true;
  private landingAnimTimer = 0;
  private previewYaw = 0;
  private lastCountdownLabel = '';
  private crashesThisRun = 0;
  private tutorialPending = false;
  private tutorialStep = 0;
  private tutorialStartHeading = 0;
  private tutorialGoTimer = 0;
  private runMaxAirTime = 0;
  private qualityLevel: QualityLevel = 'auto';
  private autoQuality: 'high' | 'low' = 'high';
  private qualityCooldown = 0;
  private fpsFrames = 0;
  private fpsTime = 0;
  private fps = 60;
  private mode: GameMode = 'standard';
  private viewMode: ViewMode = 'third';
  private oneLife = false;
  private timeRemaining = 0;
  private photoYaw = 0;
  private photoDist = 6;
  private readonly adminMode: boolean;
  private tuningPanelsCreated = false;
  private tuningVisible = false;
  private adminPanel: AdminPanel | null = null;
  private scenePanel: ScenePanel | null = null;

  constructor(container: HTMLElement, models: ModelLibrary) {
    this.renderer = new Renderer(container);
    this.lighting = new Lighting(this.renderer.scene);
    try {
      this.adminMode = new URLSearchParams(window.location.search).has('admin');
    } catch {
      this.adminMode = false;
    }
    this.input = new InputManager();
    this.models = models;

    this.physics = new PhysicsWorld(CONFIG.world.gravity);
    this.physics.setFixedStep(CONFIG.world.fixedStep);

    this.terrain = new Terrain(this.physics, this.renderer.scene);
    this.boundary = new Boundary(this.physics, this.renderer.scene, models.fences);
    this.mountainBackdrop = new MountainBackdrop(this.renderer.scene, models.mountainFar);
    this.clouds = new Clouds(this.renderer.scene, models.clouds);
    this.balloons = new Balloons(this.renderer.scene, models.balloons);
    this.sun = new Sun(this.renderer.scene, models.sun);
    this.course = new CourseGenerator(this.physics, this.renderer.scene, models);
    this.player = new Player(this.physics, this.createSpawnPoint());
    this.startSpawn = { ...this.player.spawn };

    this.characters = models.characters;
    this.selectedCharacterId = this.loadCharacterId();
    this.playerVisual = new PlayerVisual(models.board);
    this.applyCharacter(this.selectedCharacterId);
    this.renderer.scene.add(this.playerVisual.group);
    this.snowEffects = new SnowEffects(this.renderer.scene);
    this.pickupEffect = new PickupEffect(this.renderer.scene);
    this.snowTrack = new SnowTrack(this.renderer.scene);
    this.fireworks = new Fireworks(this.renderer.scene);

    this.playerController = new PlayerController(this.player, this.input);
    this.followCamera = new FollowCamera(this.renderer.camera, this.course.occluders);
    this.hud = new HUD(container);
    this.trickHud = new TrickHUD(container);
    this.startMenu = new StartMenu(container);
    this.startMenu.setOnPreviewDrag((dx) => {
      this.previewYaw += dx * CONFIG.camera.showcaseDragSpeed;
    });
    this.pauseMenu = new PauseMenu(container);
    this.crashMenu = new CrashMenu(container);
    this.resultScreen = new ResultScreen(container);
    this.settingsMenu = new SettingsMenu(container);
    this.tutorial = new Tutorial(container);
    this.tutorial.setOnSkip(() => this.finishTutorial());
    this.photoMode = new PhotoMode(container);
    this.photoMode.hide();
    this.setupPhotoInput();
    this.applySettings(getSettings());
    onSettingsChange((settings) => this.applySettings(settings));
    setUiSoundHandler((kind) => {
      if (kind === 'hover') this.audio.playUiHover();
      else if (kind === 'back') this.audio.playUiBack();
      else this.audio.playUiClick();
    });
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.handleBlur();
    });

    this.checkpointSystem = new CheckpointSystem(this.player, this.startSpawn);
    this.trickSystem = new TrickSystem(this.player, { onLanded: this.handleLanded });
    this.collisionSystem = new CollisionSystem(this.physics, this.course, {
      onCrash: this.handleCrash,
      onGate: this.handleGate,
      onCheckpoint: this.handleCheckpoint,
      onFinish: this.handleFinish,
      onItem: this.handleItem,
      onSnowpile: this.handleSnowpile,
    });
    this.setupItemSystem();

    this.loop = new GameLoop(
      CONFIG.world.fixedStep,
      CONFIG.world.maxSubSteps,
      CONFIG.world.maxFrameDelta,
      this.fixedUpdate,
      this.renderUpdate,
    );
  }

  init(): void {
    this.startMenu.setOnOpenSettings(() => this.openSettings());
    this.settingsMenu.setOnCustomize(() => this.toggleTuningPanels());
    this.settingsMenu.setOnLoadModel((file) => void this.loadLocalRider(file));
    this.settingsMenu.setOnResetCustom(() => this.resetCustomization());
    this.showStartMenu();
    if (this.adminMode) {
      this.tuningVisible = true;
      this.createTuningPanels();
    }
    void this.restoreLocalRider();
  }

  /** Shows/hides the skier-placement + scene tuning popups. */
  private toggleTuningPanels(): void {
    if (!this.tuningPanelsCreated) {
      this.tuningVisible = true;
      this.createTuningPanels();
      return;
    }
    this.tuningVisible = !this.tuningVisible;
    this.adminPanel?.setVisible(this.tuningVisible);
    this.scenePanel?.setVisible(this.tuningVisible);
  }

  /** Live tuning panels for the skier placement + scene (dev and player). */
  private createTuningPanels(): void {
    if (this.tuningPanelsCreated) return;
    this.tuningPanelsCreated = true;
    const save = () => (this.adminMode ? this.saveAdminConfig() : this.savePlayerConfig());

    if (this.characters.length > 0) {
      this.adminPanel = new AdminPanel(
        document.body,
        toAdminEntries(this.characters),
        {
          onSelect: (id, tuning) => {
            this.selectedCharacterId = id;
            this.applyCharacter(id);
            this.applyCharacterTuning(id, tuning);
          },
          onTune: (tuning) => this.applyCharacterTuning(this.selectedCharacterId, tuning),
          onSave: save,
        },
        this.selectedCharacterId,
      );
    }

    this.scenePanel = new ScenePanel(document.body, {
      onClouds: () => {
        this.clouds.dispose(this.renderer.scene);
        this.clouds = new Clouds(this.renderer.scene, this.models.clouds);
      },
      onBalloons: () => {
        this.balloons.dispose(this.renderer.scene);
        this.balloons = new Balloons(this.renderer.scene, this.models.balloons);
      },
      onSun: () => {
        this.lighting.setOffset(
          CONFIG.light.sunOffsetX,
          CONFIG.light.sunOffsetY,
          CONFIG.light.sunOffsetZ,
        );
        this.sun.setSize(CONFIG.sun.size);
      },
      onMountains: () => {
        this.mountainBackdrop.dispose(this.renderer.scene);
        this.mountainBackdrop = new MountainBackdrop(this.renderer.scene, this.models.mountainFar);
      },
      onCliffs: () => this.course.rebuildCliffs(this.physics, this.models),
      onCourse: () => this.rebuildCourseFromConfig(),
      onSave: save,
    });

    this.adminPanel?.setVisible(this.tuningVisible);
    this.scenePanel.setVisible(this.tuningVisible);
  }

  /** Loads a player-imported character model and applies it to the rider. */
  private async loadLocalRider(file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    const rider = await loadRiderFromUrl(url);
    URL.revokeObjectURL(url);
    if (!rider) return;
    const character = this.characters.find((entry) => entry.id === this.selectedCharacterId);
    if (character) character.rider = rider;
    this.playerVisual.setRider(rider, character?.yaw ?? CONFIG.player.riderYaw, character?.boardOffset);
    void saveLocalModel(file);
  }

  /** Re-applies a previously imported character model after a reload. */
  private async restoreLocalRider(): Promise<void> {
    const blob = await loadLocalModel();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const rider = await loadRiderFromUrl(url);
    URL.revokeObjectURL(url);
    if (!rider) return;
    const character = this.characters.find((entry) => entry.id === this.selectedCharacterId);
    if (character) character.rider = rider;
    this.playerVisual.setRider(rider, character?.yaw ?? CONFIG.player.riderYaw, character?.boardOffset);
  }

  /** Clears the browser's customisation + imported model and reloads. */
  private resetCustomization(): void {
    clearPlayerConfig();
    void clearLocalModel();
    window.location.reload();
  }

  /** Updates a character's stored placement and applies it to the live rider. */
  private applyCharacterTuning(
    id: string,
    tuning: { yaw: number; x: number; y: number; z: number },
  ): void {
    const character = this.characters.find((entry) => entry.id === id);
    if (character) {
      character.yaw = tuning.yaw;
      character.boardOffset = { x: tuning.x, y: tuning.y, z: tuning.z };
    }
    this.playerVisual.setRiderPlacement({ x: tuning.x, y: tuning.y, z: tuning.z }, tuning.yaw);
  }

  /** Writes scene + character tuning to public/config/scene.json (dev endpoint). */
  private async saveAdminConfig(): Promise<boolean> {
    const characters: Record<string, { yaw: number; boardOffset: { x: number; y: number; z: number } }> = {};
    for (const character of this.characters) {
      characters[character.id] = { yaw: character.yaw, boardOffset: character.boardOffset };
    }
    return saveSceneOverrides({ ...currentSceneOverrides(), characters });
  }

  /** Writes scene + character tuning to this browser's localStorage (player). */
  private async savePlayerConfig(): Promise<boolean> {
    const characters: Record<string, { yaw: number; boardOffset: { x: number; y: number; z: number } }> = {};
    for (const character of this.characters) {
      characters[character.id] = { yaw: character.yaw, boardOffset: character.boardOffset };
    }
    return savePlayerConfigLocal({ ...currentSceneOverrides(), characters });
  }

  private showStartMenu(): void {
    this.state = GameState.Menu;
    this.startMenu.show(
      this.loadBestScore(),
      this.characters,
      this.selectedCharacterId,
      () => {
        this.audio.unlock();
        this.audio.playUiClick();
        this.markIntroSeen();
        this.startMenu.hide();
        this.beginRun();
      },
      (id) => {
        this.selectedCharacterId = id;
        this.saveCharacterId(id);
        this.applyCharacter(id);
        this.audio.playUiClick();
      },
    );
    // First-time players land on the how-to page.
    if (!this.isIntroSeen()) this.startMenu.openView('howto');
  }

  private isIntroSeen(): boolean {
    try {
      return window.localStorage.getItem(Game.SEEN_INTRO_KEY) === '1';
    } catch {
      return false;
    }
  }

  private markIntroSeen(): void {
    try {
      window.localStorage.setItem(Game.SEEN_INTRO_KEY, '1');
    } catch {
      // ignore
    }
  }

  private openSettings(): void {
    this.audio.unlock();
    this.audio.playUiClick();
    this.settingsMenu.show(() => this.settingsMenu.hide());
  }

  private applySettings(settings: GameSettings): void {
    this.audio.setMasterVolume(settings.volume);
    this.audio.setMusicVolume(settings.musicVolume);
    this.audio.setSfxVolume(settings.sfxVolume);
    this.audio.setMuted(settings.muted);
    this.lighting.setShadows(settings.shadows);
    this.viewMode = settings.view;
    this.qualityLevel = settings.quality;
    this.applyQuality();
  }

  /** Applies the effective quality level (auto resolves to high/low). */
  private applyQuality(): void {
    const level = this.qualityLevel === 'auto' ? this.autoQuality : this.qualityLevel;
    this.renderer.setPixelRatioCap(level === 'low' ? 1 : CONFIG.render.maxPixelRatio);
    this.snowEffects.setDensity(level === 'low' ? 0.5 : 1);
  }

  /** Auto-pauses when the tab / window loses focus. */
  private readonly handleBlur = (): void => {
    if (this.state === GameState.Playing) this.togglePause();
  };

  /** First-person is disabled in menus, photo mode and during a crash. */
  private isFirstPerson(): boolean {
    return (
      this.viewMode === 'first' &&
      this.state !== GameState.Crashed &&
      this.state !== GameState.Menu &&
      this.state !== GameState.Photo &&
      this.state !== GameState.Finished
    );
  }

  private setupPhotoInput(): void {
    const canvas = this.renderer.renderer.domElement;
    let dragging = false;
    let lastX = 0;
    canvas.addEventListener('pointerdown', (event) => {
      if (this.state !== GameState.Photo && this.state !== GameState.Finished) return;
      dragging = true;
      lastX = event.clientX;
    });
    window.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      if (this.state === GameState.Photo) {
        this.photoYaw -= (event.clientX - lastX) * CONFIG.photo.orbitSpeed;
      } else if (this.state === GameState.Finished) {
        // Let the player pick the celebration angle by dragging.
        this.previewYaw -= (event.clientX - lastX) * CONFIG.camera.showcaseDragSpeed;
      } else {
        return;
      }
      lastX = event.clientX;
    });
    window.addEventListener('pointerup', () => {
      dragging = false;
    });
    canvas.addEventListener(
      'wheel',
      (event) => {
        if (this.state !== GameState.Photo) return;
        event.preventDefault();
        const p = CONFIG.photo;
        this.photoDist = Math.min(
          Math.max(this.photoDist + event.deltaY * p.zoomSpeed * 40, p.minDistance),
          p.maxDistance,
        );
      },
      { passive: false },
    );
  }

  private enterPhoto(): void {
    this.state = GameState.Photo;
    this.photoYaw = 0;
    this.photoDist = CONFIG.photo.maxDistance * 0.6;
    this.hud.setVisible(false);
    this.hud.setMode(null);
    this.trickHud.clear();
    this.tutorial.stop();
    this.audio.setMusicMode('menu');
    this.photoMode.show(
      () => this.savePhoto(),
      () => this.exitPhoto(),
    );
  }

  private exitPhoto(): void {
    this.photoMode.hide();
    this.state = GameState.Playing;
    this.hud.setVisible(true);
  }

  private savePhoto(): void {
    const link = document.createElement('a');
    link.download = `snowrush-${Date.now()}.png`;
    link.href = this.renderer.capture();
    link.click();
    this.photoMode.flashSaved();
  }

  /** Returns to the title screen from pause / results. */
  private toMenu(): void {
    this.finishTutorial();
    this.fireworks.stop();
    this.pauseMenu.hide();
    this.crashMenu.hide();
    this.crashMenuShown = false;
    this.settingsMenu.hide();
    this.resultScreen.hide();
    this.timer.stop();
    this.player.respawn();
    this.followCamera.snap();
    this.previewYaw = 0;
    this.hud.clearMessage();
    this.hud.setProgress(0);
    this.showStartMenu();
  }

  private computeRank(score: number): string {
    const thresholds = CONFIG.result.rankThresholds;
    const labels = ['S', 'A', 'B', 'C', 'D'];
    for (let i = 0; i < thresholds.length; i++) {
      if (score >= thresholds[i]) return labels[i];
    }
    return labels[labels.length - 1];
  }

  private shouldShowTutorial(): boolean {
    if (!getSettings().tutorial) return false;
    try {
      return window.localStorage.getItem(Game.TUTORIAL_KEY) !== '1';
    } catch {
      return true;
    }
  }

  private startTutorial(): void {
    this.tutorialStep = 0;
    this.tutorialStartHeading = this.player.heading;
    this.tutorial.start('tutorial.move');
  }

  private updateTutorial(dt: number): void {
    switch (this.tutorialStep) {
      case 0:
        if (this.player.getSpeed() > 8) {
          this.tutorialStep = 1;
          this.tutorial.setText('tutorial.turn');
        }
        break;
      case 1:
        if (Math.abs(this.player.heading - this.tutorialStartHeading) > 0.5) {
          this.tutorialStep = 2;
          this.tutorial.setText('tutorial.jump');
        }
        break;
      case 2:
        if (!this.player.grounded) {
          this.tutorialStep = 3;
          this.tutorial.setText('tutorial.gate');
        }
        break;
      case 3:
        if (this.scoreSystem.getGateCount() > 0) {
          this.tutorialStep = 4;
          this.tutorial.setText('tutorial.go');
          this.tutorialGoTimer = 1.8;
        }
        break;
      case 4:
        this.tutorialGoTimer -= dt;
        if (this.tutorialGoTimer <= 0) this.finishTutorial();
        break;
    }
  }

  private finishTutorial(): void {
    if (!this.tutorial.isActive) return;
    this.tutorial.stop();
    try {
      window.localStorage.setItem(Game.TUTORIAL_KEY, '1');
    } catch {
      // ignore
    }
  }

  private applyCharacter(id: string): void {
    const character = this.characters.find((entry) => entry.id === id) ?? this.characters[0];
    this.playerVisual.setRider(
      character?.rider ?? null,
      character?.yaw ?? CONFIG.player.riderYaw,
      character?.boardOffset,
    );
  }

  private loadCharacterId(): string {
    const fallback = Game.DEFAULT_CHARACTER;
    try {
      return window.localStorage.getItem(Game.CHARACTER_KEY) ?? fallback;
    } catch {
      return fallback;
    }
  }

  private saveCharacterId(id: string): void {
    try {
      window.localStorage.setItem(Game.CHARACTER_KEY, id);
    } catch {
      // localStorage can be unavailable (private mode); ignore.
    }
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

  private setupItemSystem(): void {
    this.itemSystem = this.course.items
      ? new ItemSystem(this.player, this.course.items, this.scoreSystem, (type) =>
          this.handleItemCollected(type),
        )
      : null;
  }

  private handleItemCollected(type: ItemType): void {
    this.hud.flashToast(`${t('item.pickup')} · ${t(`item.${type}`)}`);
    this.audio.playCombo(2);
  }

  private readonly handleItem = (index: number): void => {
    const item = this.course.items?.items[index];
    if (item && item.active) {
      this.pickupEffect.spawn(item.x, item.y, item.z, itemColor(item.type));
    }
    this.itemSystem?.collect(index);
  };

  /** Resolves the terrain/course to use for the current settings. */
  private resolveWorld(): {
    terrain: TerrainConfig;
    course: CourseConfig;
    extras: WorldExtras;
    key: string;
  } {
    const settings = getSettings();
    if (settings.mode === 'endless') {
      const seed = (Math.random() * 1e9) | 0;
      const s = CONFIG.course.sections;
      const sectionsTotal =
        s.intro + s.trees + s.slalom + s.jump + s.highSpeed + s.bigJump + s.finish;
      const repeats = 4;
      const base = CONFIG.terrain;
      const length = Math.round(sectionsTotal * repeats + base.startOffsetZ * 2);
      // Keep the heightfield cell size close to the standard track so the
      // collider and the analytic ground stay aligned over the long course.
      const segmentsZ = Math.round(base.segmentsZ * (length / base.length));
      return {
        terrain: { ...randomTerrain(seed, 1), length, segmentsZ },
        course: randomCourse(seed),
        extras: { repeats, noFinish: true, items: true },
        key: `endless:${seed}`,
      };
    }
    if (settings.track === 'random') {
      const seed = (Math.random() * 1e9) | 0;
      return {
        terrain: randomTerrain(seed),
        course: randomCourse(seed),
        extras: { repeats: 1, noFinish: false, items: true },
        key: `random:${seed}`,
      };
    }
    return {
      terrain: CONFIG.terrain,
      course: CONFIG.course,
      extras: { repeats: 1, noFinish: false, items: true },
      key: 'standard',
    };
  }

  /** Tears down and regenerates terrain, boundary and course. */
  private rebuildWorld(world: {
    terrain: TerrainConfig;
    course: CourseConfig;
    extras: WorldExtras;
    key: string;
  }): void {
    this.terrain.dispose(this.physics);
    this.boundary.dispose(this.physics);
    this.course.dispose(this.physics);
    // Sweep any leftover world bodies; the player is kept.
    this.physics.clearWorldBodies(this.player.body);

    setWorldConfig(world.terrain, world.course, world.extras);
    this.terrain = new Terrain(this.physics, this.renderer.scene);
    this.boundary = new Boundary(this.physics, this.renderer.scene, this.models.fences);
    this.course = new CourseGenerator(this.physics, this.renderer.scene, this.models);

    this.startSpawn = this.createSpawnPoint();
    this.player.setSpawn(this.startSpawn);
    this.checkpointSystem = new CheckpointSystem(this.player, this.startSpawn);
    this.followCamera = new FollowCamera(this.renderer.camera, this.course.occluders);
    this.collisionSystem = new CollisionSystem(this.physics, this.course, {
      onCrash: this.handleCrash,
      onGate: this.handleGate,
      onCheckpoint: this.handleCheckpoint,
      onFinish: this.handleFinish,
      onItem: this.handleItem,
      onSnowpile: this.handleSnowpile,
    });
    this.setupItemSystem();
    this.worldKey = world.key;
    this.hud.setProgress(0);
  }

  /** Rebuilds the whole course with the current Config (scene editor). */
  private rebuildCourseFromConfig(): void {
    this.rebuildWorld({
      terrain: getTerrainConfig(),
      course: getCourseConfig(),
      extras: getWorldExtras(),
      key: this.worldKey,
    });
  }

  private createSpawnPoint(): SpawnPoint {
    const t = getTerrainConfig();
    const p = CONFIG.player;
    const x = 0;
    const z = t.length / 2 - t.startOffsetZ;
    const y = terrainHeight(x, z) + p.capsuleHalfHeight + p.capsuleRadius + 0.3;
    return { x, y, z, heading: 0 };
  }

  /** Starts (or restarts) a run: reset stats, respawn, then count down. */
  private readonly beginRun = (): void => {
    const world = this.resolveWorld();
    if (world.key !== this.worldKey) this.rebuildWorld(world);
    else this.course.reset();
    this.itemSystem?.reset();
    this.scoreSystem.reset();
    this.timer.reset();
    this.maxSpeedKmh = 0;
    this.crashTimer = 0;
    this.crashElapsed = 0;
    this.previewYaw = 0;
    this.lastCountdownLabel = '';
    this.crashesThisRun = 0;
    this.snowTrack.reset();
    this.fireworks.stop();
    this.runMaxAirTime = 0;
    this.mode = getSettings().mode;
    this.oneLife = this.mode === 'oneline';
    this.timeRemaining = this.mode === 'time' ? CONFIG.modes.timeAttackSeconds : 0;
    this.photoMode.hide();
    this.tutorial.stop();
    this.tutorialPending = this.shouldShowTutorial();
    this.settingsMenu.hide();
    this.hud.setProgress(0);
    this.checkpointSystem.reset(this.startSpawn);
    this.player.setSpawn(this.startSpawn);
    this.player.respawn();
    this.followCamera.snap();
    this.startMenu.hide();
    this.pauseMenu.hide();
    this.crashMenu.hide();
    this.crashMenuShown = false;
    this.resultScreen.hide();
    this.trickHud.clear();
    this.hud.clearMessage();
    this.hud.showHint();
    this.countdownRemaining = CONFIG.timer.countdownSeconds;
    this.state = GameState.Countdown;
  };

  private readonly handleSnowpile = (): void => {
    if (this.state !== GameState.Playing) return;
    this.player.scrubSpeed(CONFIG.course.snowpiles.slowdownFactor);
  };

  private readonly handleCrash = (): void => {
    if (this.state !== GameState.Playing) return;
    if (this.itemSystem?.isInvincible()) return;
    if (this.itemSystem?.consumeShield()) {
      this.hud.flashToast(t('item.shield'));
      return;
    }
    if (this.oneLife) {
      this.crashesThisRun += 1;
      this.finishRun('crash');
      return;
    }
    this.state = GameState.Crashed;
    this.crashMenuShown = false;
    this.crashMenu.hide();
    this.crashesThisRun += 1;
    this.crashTimer = CONFIG.crash.respawnDelay;
    this.crashElapsed = 0;
    this.trickSystem.cancel();
    this.scoreSystem.resetCombo();
    this.trickHud.clear();
    this.player.crash();
    this.followCamera.addShake(CONFIG.camera.crashShake);
    this.audio.playCrash();
    this.hud.setMessage(t('message.crashed'));
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
    this.hud.flashMessage(t('message.checkpoint'), 1200);
  };

  private readonly handleFinish = (): void => {
    this.finishRun('finish');
  };

  /** Ends the run (reached the finish, ran out of time or crashed in one-life). */
  private finishRun(reason: 'finish' | 'timeup' | 'crash'): void {
    if (this.state !== GameState.Playing) return;
    this.state = GameState.Finished;
    this.timer.stop();
    this.hud.clearMessage();
    this.hud.setMode(null);
    this.finishTutorial();
    this.photoMode.hide();

    const score = this.scoreSystem.getScore();
    const completed = reason === 'finish';
    const previousBest = this.loadBestScore();
    const newBest = completed && score > 0 && score > previousBest;
    if (completed) {
      this.saveBestScore(score);
      this.fireworks.start();
    }

    const run = {
      score,
      timeMs: Math.round(this.timer.getElapsed() * 1000),
      maxSpeedKmh: this.maxSpeedKmh,
      maxCombo: this.scoreSystem.getMaxCombo(),
      maxAirTime: this.runMaxAirTime,
      tricks: this.scoreSystem.getTrickCount(),
      gates: this.scoreSystem.getGateCount(),
      crashes: this.crashesThisRun,
    };
    const records = completed ? recordRun(run) : undefined;
    const newAchievements = completed ? evaluateAchievements(run, getStats()) : [];
    const dailyCompleted = completed ? evaluateDaily(run) : false;

    this.resultScreen.show(
      {
        time: this.timer.format(),
        score,
        maxSpeedKmh: this.maxSpeedKmh,
        gates: this.scoreSystem.getGateCount(),
        tricks: this.scoreSystem.getTrickCount(),
        maxCombo: this.scoreSystem.getMaxCombo(),
        rank: this.computeRank(score),
        newBest,
        records,
        newAchievements,
        dailyCompleted,
      },
      this.beginRun,
      () => this.toMenu(),
    );
  }

  private respawn(): void {
    this.crashMenu.hide();
    this.crashMenuShown = false;
    this.fireworks.stop();
    this.snowTrack.reset();
    this.checkpointSystem.respawnPlayer();
    this.followCamera.snap();
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
      this.pauseMenu.show({
        onResume: () => this.togglePause(),
        onRestart: () => this.beginRun(),
        onSettings: () => this.openSettings(),
        onQuit: () => this.toMenu(),
      });
    }
  }

  private readonly fixedUpdate = (dt: number): void => {
    if (this.state === GameState.Playing) {
      if (this.mode === 'time') {
        this.timeRemaining -= dt;
        if (this.timeRemaining <= 0) {
          this.timeRemaining = 0;
          this.finishRun('timeup');
          return;
        }
      }
      this.player.speedMultiplier = this.itemSystem?.getSpeedMultiplier() ?? 1;
      this.playerController.update(dt);
      this.physics.step();
      this.collisionSystem.update();
      this.trickSystem.update();
      // Landing evaluation reads the air rotation above; reset it afterwards so
      // the board does not stay visually pitched once the rider is grounded.
      if (this.player.grounded) this.player.resetAirRotations();
      this.itemSystem?.update(dt);
      this.timer.update(dt);
      return;
    }

    if (this.state === GameState.Crashed) {
      // Freeze the world while the crash menu is open; otherwise keep the
      // tumble running until it is time to ask the player what to do.
      if (this.crashMenuShown) return;
      this.physics.step();
      this.crashElapsed += dt;
      this.crashTimer -= dt;
      if (this.crashTimer <= 0) {
        this.crashMenuShown = true;
        this.crashMenu.show({
          onRespawn: () => this.respawn(),
          onRestart: () => this.beginRun(),
          onQuit: () => this.toMenu(),
        });
      }
      return;
    }

    if (this.state === GameState.Countdown) {
      this.physics.step();
      this.countdownRemaining -= dt;
      if (this.countdownRemaining <= -0.6) {
        this.state = GameState.Playing;
        this.timer.start();
        this.hud.clearMessage();
        if (this.tutorialPending) {
          this.tutorialPending = false;
          this.startTutorial();
        }
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

    if (this.input.wasPressed('mute')) {
      const muted = !getSettings().muted;
      updateSettings({ muted });
      this.hud.flashToast(t(muted ? 'message.muted' : 'message.unmuted'));
    }

    if (this.input.wasPressed('photo')) {
      if (this.state === GameState.Playing) this.enterPhoto();
      else if (this.state === GameState.Photo) this.exitPhoto();
    }

    if (
      this.input.wasPressed('view') &&
      (this.state === GameState.Playing || this.state === GameState.Countdown)
    ) {
      const view: ViewMode = getSettings().view === 'third' ? 'first' : 'third';
      updateSettings({ view });
      this.hud.flashToast(t(view === 'first' ? 'message.firstPerson' : 'message.thirdPerson'));
    }
    if (this.state === GameState.Photo && this.input.wasPressed('pause')) {
      this.exitPhoto();
    }

    if (this.state === GameState.Playing) {
      this.checkOutOfBounds(position);
      this.maxSpeedKmh = Math.max(this.maxSpeedKmh, this.player.getSpeedKmh());
      const finishZ = this.course.finish?.placement.z;
      if (finishZ !== undefined) {
        const span = this.course.startZ - finishZ;
        this.hud.setProgress(span > 0 ? (this.course.startZ - position.z) / span : 0);
      }
      if (this.tutorial.isActive) this.updateTutorial(dt);
      this.runMaxAirTime = Math.max(this.runMaxAirTime, this.player.airTime);
    }

    if (this.state === GameState.Countdown) {
      const label =
        this.countdownRemaining > 0 ? String(Math.ceil(this.countdownRemaining)) : t('message.go');
      if (label !== this.lastCountdownLabel) {
        this.lastCountdownLabel = label;
        this.hud.setMessage(label);
        if (label === t('message.go')) this.audio.playGo();
        else this.audio.playCountdown();
      }
    }

    // Crash tumble: tip sideways and pitch forward so the fall reads clearly.
    const crashT =
      this.state === GameState.Crashed
        ? Math.min(this.crashElapsed * CONFIG.crash.tiltSpeed, 2.6)
        : 0;
    const tilt = Math.min(crashT, 1.5);

    // Animation follows the authoritative player state (never the other way).
    // Jump / Landing are brief one-shots gated by their clip-length windows.
    // The controller only marks the player grounded while actually playing, so
    // menu / countdown / respawn must be treated as "standing" explicitly —
    // otherwise the rider would show the airborne pose (arms out) at the start.
    const menuState =
      this.state === GameState.Menu ||
      this.state === GameState.Loading ||
      this.state === GameState.Countdown ||
      this.state === GameState.Respawn ||
      this.state === GameState.Finished;
    let animation: PlayerAnimation;
    if (this.state === GameState.Crashed) {
      animation = 'Crash';
    } else if (menuState) {
      animation = 'SkiIdle';
    } else if (!this.player.grounded) {
      animation =
        this.player.airControlEnabled && this.player.airTime < CONFIG.player.jumpAnimWindow
          ? 'Jump'
          : 'Air';
    } else if (this.landingAnimTimer > 0) {
      animation = 'Landing';
    } else {
      animation = 'SkiIdle';
    }
    this.landingAnimTimer = Math.max(0, this.landingAnimTimer - dt);
    // Menu preview and the finish celebration both spin the rider in place
    // (fixed camera, fixed world; card shown on the right).
    const showcaseMode = this.state === GameState.Menu || this.state === GameState.Finished;
    if (showcaseMode) this.previewYaw += dt * CONFIG.camera.showcaseSpinSpeed;
    this.playerVisual.setPreviewYaw(showcaseMode ? this.previewYaw : 0);

    this.playerVisual.setAnimation(animation);
    this.playerVisual.update(dt);
    this.playerVisual.sync(
      position,
      this.player.heading,
      tilt,
      this.state === GameState.Crashed ? crashT : this.player.airRotationX,
      this.player.airRotationZ,
      this.player.lean,
    );
    this.snowTrack.update(position, this.player.heading, this.player.grounded, this.player.getSpeed());
    const landing = this.snowEffects.update(dt, this.player);
    const grounded = this.player.grounded;
    if (!grounded && this.wasGrounded) this.audio.playJump();
    if (landing.landed) {
      if (!prefersReducedMotion()) {
        this.followCamera.addShake(landing.strength * CONFIG.camera.landingShakeScale);
      }
      this.audio.playLanding(landing.strength);
      this.playerVisual.landPulse(landing.strength);
      this.landingAnimTimer = CONFIG.player.landingAnimWindow;
    }
    this.wasGrounded = grounded;
    // Silence the wind / slide beds once the run is over (finish celebration).
    if (this.state === GameState.Finished) this.audio.update(0, false, 0);
    else this.audio.update(this.player.getSpeed(), grounded, this.player.lean);
    const firstPerson = this.isFirstPerson();
    this.playerVisual.setFirstPerson(firstPerson);
    if (
      this.state === GameState.Menu ||
      this.state === GameState.Finished ||
      this.state === GameState.Crashed
    ) {
      this.followCamera.showcase(position, this.player.heading);
    } else if (this.state === GameState.Photo) {
      this.followCamera.photo(position, this.player.heading, this.photoYaw, this.photoDist);
    } else if (firstPerson) {
      this.followCamera.updateFirstPerson(
        position,
        this.player.heading,
        this.player.getSpeed(),
        this.player.grounded,
        dt,
      );
    } else {
      this.followCamera.update(
        position,
        this.player.heading,
        this.player.getSpeed(),
        dt,
        this.player.grounded,
      );
    }
    this.lighting.update(position);
    const groundY = terrainHeight(position.x, position.z);
    this.mountainBackdrop.update(position.x, position.z);
    this.clouds.update(position.x, groundY, position.z, dt);
    this.balloons.update(position.x, groundY, position.z, dt);
    this.sun.update(position.x, position.y, position.z);
    this.hud.setVisible(
      this.state !== GameState.Menu && this.state !== GameState.Photo,
    );
    this.hud.update(this.player);
    this.hud.setScore(this.scoreSystem.getScore());
    // timeRemaining is in seconds; formatTime() expects milliseconds.
    this.hud.setTime(
      this.mode === 'time' ? formatTime(this.timeRemaining * 1000) : this.timer.format(),
    );
    this.hud.setMode(
      this.state === GameState.Playing && this.mode === 'time'
        ? `${t('mode.time')} ${formatTime(this.timeRemaining * 1000)}`
        : this.state === GameState.Playing && this.mode === 'oneline'
          ? t('mode.oneline')
          : null,
    );
    this.course.items?.update(dt);
    this.pickupEffect.update(dt);
    this.fireworks.update(dt, position);
    this.hud.setEffects(this.itemSystem?.getActive() ?? []);
    this.audio.setMusicMode(this.state === GameState.Menu ? 'menu' : 'game');
    this.measurePerformance(dt);
    this.renderer.render();
    this.input.update();
  };

  /** Tracks FPS, adapts quality in auto mode and drives the FPS readout. */
  private measurePerformance(dt: number): void {
    this.fpsFrames += 1;
    this.fpsTime += dt;
    if (this.qualityCooldown > 0) this.qualityCooldown -= dt;

    if (this.fpsTime >= 0.5) {
      this.fps = this.fpsFrames / this.fpsTime;
      this.fpsFrames = 0;
      this.fpsTime = 0;

      if (this.qualityLevel === 'auto' && this.qualityCooldown <= 0) {
        if (this.fps < 45 && this.autoQuality === 'high') {
          this.autoQuality = 'low';
          this.qualityCooldown = 3;
          this.applyQuality();
        } else if (this.fps > 58 && this.autoQuality === 'low') {
          this.autoQuality = 'high';
          this.qualityCooldown = 3;
          this.applyQuality();
        }
      }
    }

    this.hud.setFps(this.fps, getSettings().showFps);
  }

  /** Safety net so a run cannot be lost by sliding off the world. */
  private checkOutOfBounds(position: THREE.Vector3): void {
    const ground = terrainHeight(position.x, position.z);
    if (position.y < ground - CONFIG.player.fallResetDepth) {
      this.respawn();
    }
  }
}
