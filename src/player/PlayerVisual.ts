import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import type { BoardAsset, RiderAsset } from '../world/ModelLibrary';
import { CharacterAnimator, type CharacterClipName } from './CharacterAnimator';

/** Animation states the game can request for the rider. */
export type PlayerAnimation = CharacterClipName;

/**
 * Player visuals: snowboard plus a swappable rider model. Falls back to a
 * primitive character if the model could not be loaded.
 *
 * Structure: outer group holds position + heading, inner group holds the crash
 * roll / flip / lean / trick rotation so the two never interfere.
 *
 * Riders may be either primitive / spine-only (legacy) models or full skinned
 * characters with the five SnowRush clips; the latter are driven through
 * CharacterAnimator and bring their own snowboard.
 */
export class PlayerVisual {
  readonly group = new THREE.Group();

  private readonly tiltGroup = new THREE.Group();
  private readonly fpHands = new THREE.Group();
  private readonly board: THREE.Group;
  private readonly boardTop: number;
  private riderRoot: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private animator: CharacterAnimator | null = null;
  private actions: Partial<Record<'idle' | 'air' | 'crash', THREE.AnimationAction>> = {};
  private currentAnimation: PlayerAnimation | null = null;
  /** Extra yaw used only by the menu preview to spin the rider in place. */
  private previewYaw = 0;
  /** Landing squash amount, decays over time. */
  private squash = 0;

  constructor(board: BoardAsset | null = null) {
    const p = CONFIG.player;
    const colors = CONFIG.colors;
    this.boardTop = -(p.capsuleHalfHeight + p.capsuleRadius) + 0.04;

    this.group.add(this.tiltGroup);

    this.board = new THREE.Group();
    if (board) {
      board.object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.frustumCulled = false;
      });
      this.board.add(board.object);
      // The asset is authored flat with its deck base at y = 0.
      this.board.position.y = -(p.capsuleHalfHeight + p.capsuleRadius);
    } else {
      const fallback = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.07, 1.75),
        new THREE.MeshStandardMaterial({ color: colors.board, roughness: 0.55, flatShading: true }),
      );
      fallback.castShadow = true;
      this.board.add(fallback);
      this.board.position.y = this.boardTop;
    }
    this.tiltGroup.add(this.board);

    // First-person props: a board nose and two gloved hands placed forward of
    // the eye so the first-person view is not empty.
    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0x1f2933,
      roughness: 0.8,
      flatShading: true,
    });
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.06, 0.5),
      new THREE.MeshStandardMaterial({ color: colors.board, roughness: 0.55, flatShading: true }),
    );
    nose.position.set(0, 0.02, -1.15);
    this.fpHands.add(nose);
    for (const side of [-1, 1]) {
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.26), gloveMat);
      hand.position.set(side * 0.32, 0.16, -0.8);
      hand.rotation.z = side * 0.25;
      this.fpHands.add(hand);
    }
    this.fpHands.visible = false;
    this.tiltGroup.add(this.fpHands);
  }

  /** Replaces the current rider (model or primitive). Safe to call per run. */
  setRider(
    rider: RiderAsset | null,
    yaw = CONFIG.player.riderYaw,
    offset: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
  ): void {
    if (this.riderRoot) {
      this.tiltGroup.remove(this.riderRoot);
      this.riderRoot = null;
    }
    this.disposeAnimation();
    this.board.visible = true;

    if (rider) this.buildRider(rider, yaw, offset);
    else this.buildPrimitiveRider();
  }

  /** Live-adjusts the current rider's placement on the board (admin tuning). */
  setRiderPlacement(offset: { x: number; y: number; z: number }, yaw: number): void {
    if (!this.riderRoot) return;
    this.riderRoot.position.set(offset.x, this.boardTop + offset.y, offset.z);
    this.riderRoot.rotation.y = yaw;
  }

  private disposeAnimation(): void {
    this.mixer?.stopAllAction();
    this.animator?.dispose();
    this.mixer = null;
    this.animator = null;
    this.actions = {};
    this.currentAnimation = null;
  }

  private buildRider(
    rider: RiderAsset,
    yaw: number,
    offset: { x: number; y: number; z: number },
  ): void {
    const root = new THREE.Group();
    root.position.set(offset.x, this.boardTop + offset.y, offset.z);
    root.rotation.y = yaw;
    root.add(rider.container);
    this.tiltGroup.add(root);
    this.riderRoot = root;

    // Full skinned character: own board + five clips, driven by CharacterAnimator.
    const animator = new CharacterAnimator(rider.container, rider.animations);
    if (animator.isComplete) {
      this.animator = animator;
      // Only hide the game board when the model ships its own.
      this.board.visible = !rider.hasBoard;
      this.animator.playSkiIdle();
      this.currentAnimation = 'SkiIdle';
      return;
    }
    animator.dispose();

    // Legacy riders only expose Idle / Jump; fall back to a simple mixer.
    this.mixer = new THREE.AnimationMixer(rider.container);
    const clip = (suffix: string) =>
      rider.animations.find(
        (animation) => animation.name.split('|').pop()?.toLowerCase() === suffix.toLowerCase(),
      );
    const idle = clip('Idle') ?? rider.animations[0];
    const air = clip('Jump') ?? clip('Walking') ?? clip('Run') ?? idle;
    if (idle) this.actions.idle = this.mixer.clipAction(idle);
    if (air) this.actions.air = this.mixer.clipAction(air);
    this.actions.crash = this.actions.idle;

    this.setAnimation('SkiIdle');
  }

  private buildPrimitiveRider(): void {
    const colors = CONFIG.colors;
    const root = new THREE.Group();
    root.position.y = this.boardTop;
    this.tiltGroup.add(root);
    this.riderRoot = root;

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.2, 0.5, 4, 8),
      new THREE.MeshStandardMaterial({ color: colors.jacket, roughness: 0.85, flatShading: true }),
    );
    torso.position.y = 0.6;
    torso.castShadow = true;
    root.add(torso);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 8, 6),
      new THREE.MeshStandardMaterial({ color: colors.helmet, roughness: 0.7, flatShading: true }),
    );
    head.position.y = 1.15;
    head.castShadow = true;
    root.add(head);
  }

  /** Switches the rider animation with a short cross-fade. */
  setAnimation(state: PlayerAnimation): void {
    if (this.currentAnimation === state) return;

    if (this.animator) {
      this.currentAnimation = state;
      this.animator.setClip(state);
      return;
    }

    // Legacy models only have idle / air / crash actions.
    const legacy: 'idle' | 'air' | 'crash' =
      state === 'Crash' ? 'crash' : state === 'SkiIdle' || state === 'Landing' ? 'idle' : 'air';
    const next = this.actions[legacy];
    if (!next) return;

    const previous = this.currentAnimation && this.actions[legacyKey(this.currentAnimation)];
    this.currentAnimation = state;

    next.reset().fadeIn(CONFIG.player.animFade).play();
    if (previous && previous !== next) previous.fadeOut(CONFIG.player.animFade);
  }

  update(dt: number): void {
    if (this.animator) this.animator.update(dt);
    else this.mixer?.update(dt);

    if (this.squash > 0.001) {
      this.squash *= Math.exp(-9 * dt);
      const s = this.squash;
      this.tiltGroup.scale.set(1 + s * 0.1, 1 - s * 0.16, 1 + s * 0.1);
    } else if (this.squash !== 0) {
      this.squash = 0;
      this.tiltGroup.scale.set(1, 1, 1);
    }
  }

  /** Small squash-and-stretch pulse on landing, scaled by impact strength. */
  landPulse(strength: number): void {
    this.squash = Math.min(Math.max(strength, 0), 1) * 1.1;
  }

  /** Menu-only yaw offset so the rider can rotate while the world stays fixed. */
  setPreviewYaw(yaw: number): void {
    this.previewYaw = yaw;
  }

  /**
   * First-person: hide the rider model but keep the board + gloved hands so the
   * view has something to read.
   */
  setFirstPerson(on: boolean): void {
    if (this.riderRoot) this.riderRoot.visible = !on;
    this.fpHands.visible = on;
  }

  sync(position: THREE.Vector3, heading: number, tilt = 0, pitch = 0, roll = 0, lean = 0): void {
    this.group.position.copy(position);
    this.group.rotation.y = heading + this.previewYaw;
    // pitch = front/backflip, roll + tilt = roll / crash fall, lean = carve
    this.tiltGroup.rotation.set(pitch, 0, roll + tilt + lean);
  }
}

/** Maps a rich animation state to the coarse key used by legacy actions. */
function legacyKey(state: PlayerAnimation): 'idle' | 'air' | 'crash' {
  return state === 'Crash' ? 'crash' : state === 'SkiIdle' || state === 'Landing' ? 'idle' : 'air';
}
