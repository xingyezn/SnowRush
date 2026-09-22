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
import { CourseGenerator } from '../world/CourseGenerator';
import type { CharacterOption, ModelLibrary } from '../world/ModelLibrary';
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

/**
 * Orchestrator: creates systems, owns GameState and schedules updates.
 * Contains no terrain / player / camera algorithms itself.
 */
export class Game {
  private static readonly BEST_SCORE_KEY = 'SnowRush.best';
  private static readonly CHARACTER_KEY = 'SnowRush.character';
  private static readonly SEEN_INTRO_KEY = 'SnowRush.seenIntro';
  private static readonly TUTORIAL_KEY = 'SnowRush.tutorialDone';

  private readonly renderer: Renderer;
  private readonly lighting: Lighting;
  private readonly mountainBackdrop: MountainBackdrop;
  private readonly clouds: Clouds;
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
  private readonly settingsMenu: SettingsMenu;
  private readonly tutorial: Tutorial;
  private readonly photoMode: PhotoMode;
  private readonly input: InputManager;
  private readonly loop: GameLoop;
  private readonly collisionSystem: CollisionSystem;
  private readonly checkpointSystem: CheckpointSystem;
  private readonly trickSystem: TrickSystem;
  private readonly audio = new AudioSystem();
  private readonly scoreSystem = new ScoreSystem();
  private readonly timer = new Timer();
  private readonly startSpawn: SpawnPoint;
  private readonly characters: CharacterOption[];
  private selectedCharacterId: string;

  private readonly playerPosition = new THREE.Vector3();
  private state: GameState = GameState.Loading;
  private crashTimer = 0;
  private crashElapsed = 0;
  private countdownRemaining = 0;
  private maxSpeedKmh = 0;
  private wasGrounded = true;
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

  constructor(container: HTMLElement, models: ModelLibrary) {
    this.renderer = new Renderer(container);
    this.lighting = new Lighting(this.renderer.scene);
    this.input = new InputManager();

    this.physics = new PhysicsWorld(CONFIG.world.gravity);
    this.physics.setFixedStep(CONFIG.world.fixedStep);

    this.terrain = new Terrain(this.physics, this.renderer.scene);
    this.boundary = new Boundary(this.physics, this.renderer.scene);
    this.mountainBackdrop = new MountainBackdrop(this.renderer.scene);
    this.clouds = new Clouds(this.renderer.scene);
    this.course = new CourseGenerator(this.physics, this.renderer.scene, models);
    this.player = new Player(this.physics, this.createSpawnPoint());
    this.startSpawn = { ...this.player.spawn };

    this.characters = models.characters;
    this.selectedCharacterId = this.loadCharacterId();
    this.playerVisual = new PlayerVisual();
    this.applyCharacter(this.selectedCharacterId);
    this.renderer.scene.add(this.playerVisual.group);
    this.snowEffects = new SnowEffects(this.renderer.scene);

    this.playerController = new PlayerController(this.player, this.input);
    this.followCamera = new FollowCamera(this.renderer.camera, this.course.occluders);
    this.hud = new HUD(container);
    this.hud.onPause(() => this.togglePause());
    this.trickHud = new TrickHUD(container);
    this.startMenu = new StartMenu(container);
    this.startMenu.setOnPreviewDrag((dx) => {
      this.previewYaw += dx * CONFIG.camera.showcaseDragSpeed;
    });
    this.pauseMenu = new PauseMenu(container);
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
    this.startMenu.setOnOpenSettings(() => this.openSettings());
    this.showStartMenu();
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
      this.state !== GameState.Photo
    );
  }

  private setupPhotoInput(): void {
    const canvas = this.renderer.renderer.domElement;
    let dragging = false;
    let lastX = 0;
    canvas.addEventListener('pointerdown', (event) => {
      if (this.state !== GameState.Photo) return;
      dragging = true;
      lastX = event.clientX;
    });
    window.addEventListener('pointermove', (event) => {
      if (!dragging || this.state !== GameState.Photo) return;
      this.photoYaw -= (event.clientX - lastX) * CONFIG.photo.orbitSpeed;
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
    this.pauseMenu.hide();
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
    this.playerVisual.setRider(character?.rider ?? null, character?.yaw ?? CONFIG.player.riderYaw);
  }

  private loadCharacterId(): string {
    try {
      return window.localStorage.getItem(Game.CHARACTER_KEY) ?? this.characters[0]?.id ?? '';
    } catch {
      return this.characters[0]?.id ?? '';
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
    this.previewYaw = 0;
    this.lastCountdownLabel = '';
    this.crashesThisRun = 0;
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
    this.resultScreen.hide();
    this.trickHud.clear();
    this.hud.clearMessage();
    this.hud.showHint();
    this.countdownRemaining = CONFIG.timer.countdownSeconds;
    this.state = GameState.Countdown;
  };

  private readonly handleCrash = (): void => {
    if (this.state !== GameState.Playing) return;
    if (this.oneLife) {
      this.crashesThisRun += 1;
      this.finishRun('crash');
      return;
    }
    this.state = GameState.Crashed;
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
    this.hud.setMessage(t('message.checkpoint'));
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
    if (completed) this.saveBestScore(score);

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
      const span = this.course.startZ - this.course.finish.placement.z;
      this.hud.setProgress(span > 0 ? (this.course.startZ - position.z) / span : 0);
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

    const tilt =
      this.state === GameState.Crashed
        ? Math.min(this.crashElapsed * CONFIG.crash.tiltSpeed, 1.5)
        : 0;

    // The rider idles in menus / countdown even though the controller has not
    // yet marked them grounded. In the menu it plays the action clip so the
    // preview shows a basic move.
    const playing = this.state === GameState.Playing;
    const animation: RiderAnimation =
      this.state === GameState.Crashed
        ? 'crash'
        : this.state === GameState.Menu
          ? 'air'
          : !playing || this.player.grounded
            ? 'idle'
            : 'air';
    // The menu preview spins the rider in place (fixed camera, fixed world).
    const menuPreview = this.state === GameState.Menu;
    if (menuPreview) this.previewYaw += dt * CONFIG.camera.showcaseSpinSpeed;
    this.playerVisual.setPreviewYaw(menuPreview ? this.previewYaw : 0);

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
      if (!prefersReducedMotion()) {
        this.followCamera.addShake(landing.strength * CONFIG.camera.landingShakeScale);
      }
      this.audio.playLanding(landing.strength);
      this.playerVisual.landPulse(landing.strength);
    }
    this.wasGrounded = grounded;
    this.audio.update(this.player.getSpeed(), grounded, this.player.lean);
    const firstPerson = this.isFirstPerson();
    this.playerVisual.setVisible(!firstPerson);
    if (this.state === GameState.Menu) {
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
    this.hud.setVisible(
      this.state !== GameState.Menu && this.state !== GameState.Photo,
    );
    this.hud.update(this.player);
    this.hud.setScore(this.scoreSystem.getScore());
    this.hud.setTime(this.mode === 'time' ? formatTime(this.timeRemaining) : this.timer.format());
    this.hud.setMode(
      this.state === GameState.Playing && this.mode === 'time'
        ? `${t('mode.time')} ${formatTime(this.timeRemaining)}`
        : this.state === GameState.Playing && this.mode === 'oneline'
          ? t('mode.oneline')
          : null,
    );
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
