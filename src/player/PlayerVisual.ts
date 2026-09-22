import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import type { RiderAsset } from '../world/ModelLibrary';

export type RiderAnimation = 'idle' | 'air' | 'crash';

/**
 * Player visuals: snowboard plus a swappable rider model. Falls back to a
 * primitive character if the model could not be loaded.
 *
 * Structure: outer group holds position + heading, inner group holds the crash
 * roll / flip / lean so the two never interfere.
 */
export class PlayerVisual {
  readonly group = new THREE.Group();

  private readonly tiltGroup = new THREE.Group();
  private readonly boardTop: number;
  private riderRoot: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private actions: Partial<Record<RiderAnimation, THREE.AnimationAction>> = {};
  private currentAnimation: RiderAnimation | null = null;
  /** Extra yaw used only by the menu preview to spin the rider in place. */
  private previewYaw = 0;
  /** Landing squash amount, decays over time. */
  private squash = 0;

  constructor() {
    const p = CONFIG.player;
    const colors = CONFIG.colors;
    this.boardTop = -(p.capsuleHalfHeight + p.capsuleRadius) + 0.04;

    this.group.add(this.tiltGroup);

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.07, 1.75),
      new THREE.MeshStandardMaterial({ color: colors.board, roughness: 0.55, flatShading: true }),
    );
    board.position.y = this.boardTop;
    board.castShadow = true;
    this.tiltGroup.add(board);
  }

  /** Replaces the current rider (model or primitive). Safe to call per run. */
  setRider(rider: RiderAsset | null, yaw = CONFIG.player.riderYaw): void {
    if (this.riderRoot) {
      this.tiltGroup.remove(this.riderRoot);
      this.riderRoot = null;
    }
    this.mixer?.stopAllAction();
    this.mixer = null;
    this.actions = {};
    this.currentAnimation = null;

    if (rider) this.buildRider(rider, yaw);
    else this.buildPrimitiveRider();
  }

  private buildRider(rider: RiderAsset, yaw: number): void {
    const root = new THREE.Group();
    root.position.y = this.boardTop;
    root.rotation.y = yaw;
    root.add(rider.container);
    this.tiltGroup.add(root);
    this.riderRoot = root;

    this.mixer = new THREE.AnimationMixer(rider.container);
    const clip = (suffix: string) =>
      rider.animations.find(
        (animation) => animation.name.split('|').pop()?.toLowerCase() === suffix.toLowerCase(),
      );

    // The clip set depends on the model; fall back to whatever is available.
    const idle = clip('Idle') ?? rider.animations[0];
    const air = clip('Jump') ?? clip('Walking') ?? clip('Run') ?? idle;
    if (idle) this.actions.idle = this.mixer.clipAction(idle);
    if (air) this.actions.air = this.mixer.clipAction(air);
    this.actions.crash = this.actions.idle;

    this.setAnimation('idle');
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
  setAnimation(state: RiderAnimation): void {
    if (this.currentAnimation === state) return;
    const next = this.actions[state];
    if (!next) return;

    const previous = this.currentAnimation ? this.actions[this.currentAnimation] : undefined;
    this.currentAnimation = state;

    next.reset().fadeIn(0.15).play();
    if (previous && previous !== next) previous.fadeOut(0.15);
  }

  update(dt: number): void {
    this.mixer?.update(dt);
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

  /** Hides the whole rider (used by the first-person camera). */
  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  sync(position: THREE.Vector3, heading: number, tilt = 0, pitch = 0, roll = 0, lean = 0): void {
    this.group.position.copy(position);
    this.group.rotation.y = heading + this.previewYaw;
    // pitch = front/backflip, roll + tilt = roll / crash fall, lean = carve
    this.tiltGroup.rotation.set(pitch, 0, roll + tilt + lean);
  }
}
