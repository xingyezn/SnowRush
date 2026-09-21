import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import type { RiderAsset } from '../world/ModelLibrary';

export type RiderAnimation = 'idle' | 'air' | 'crash';

/**
 * Player visuals: snowboard plus an animated rider (CC0 Quaternius character).
 * Falls back to a primitive character if the model could not be loaded.
 *
 * Structure: outer group holds position + heading, inner group holds the crash
 * roll / flip / lean so the two never interfere.
 */
export class PlayerVisual {
  readonly group = new THREE.Group();

  private readonly tiltGroup = new THREE.Group();
  private mixer: THREE.AnimationMixer | null = null;
  private readonly actions: Partial<Record<RiderAnimation, THREE.AnimationAction>> = {};
  private currentAnimation: RiderAnimation | null = null;

  constructor(rider: RiderAsset | null) {
    const p = CONFIG.player;
    const colors = CONFIG.colors;
    const boardTop = -(p.capsuleHalfHeight + p.capsuleRadius) + 0.04;

    this.group.add(this.tiltGroup);

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.07, 1.75),
      new THREE.MeshStandardMaterial({ color: colors.board, roughness: 0.55, flatShading: true }),
    );
    board.position.y = boardTop;
    board.castShadow = true;
    this.tiltGroup.add(board);

    if (rider) this.buildRider(rider, boardTop);
    else this.buildPrimitiveRider(boardTop);
  }

  private buildRider(rider: RiderAsset, boardTop: number): void {
    const root = new THREE.Group();
    root.position.y = boardTop;
    root.rotation.y = CONFIG.player.riderYaw;
    root.add(rider.container);
    this.tiltGroup.add(root);

    this.mixer = new THREE.AnimationMixer(rider.container);
    const clip = (suffix: string) =>
      rider.animations.find((animation) => animation.name.split('|').pop() === suffix);

    // The clip set depends on the model; fall back to whatever is available.
    const idle = clip('Idle') ?? rider.animations[0];
    const air = clip('Walking') ?? clip('Run') ?? clip('Jump') ?? idle;
    if (idle) this.actions.idle = this.mixer.clipAction(idle);
    if (air) this.actions.air = this.mixer.clipAction(air);
    this.actions.crash = this.actions.idle;

    this.addGoggles(rider.container);
    this.setAnimation('idle');
  }

  /** Ski goggles attached to the head bone (small extra charm). */
  private addGoggles(root: THREE.Object3D): void {
    const head = root.getObjectByName('Head') as THREE.Bone | undefined;
    if (!head) return;

    const goggles = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.15, 0.1),
      new THREE.MeshStandardMaterial({
        color: 0x151a20,
        roughness: 0.25,
        metalness: 0.2,
        flatShading: true,
      }),
    );
    goggles.position.set(0, 0.2, 0.3);
    goggles.castShadow = true;
    head.add(goggles);
  }

  private buildPrimitiveRider(boardTop: number): void {
    const colors = CONFIG.colors;
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.2, 0.5, 4, 8),
      new THREE.MeshStandardMaterial({ color: colors.jacket, roughness: 0.85, flatShading: true }),
    );
    torso.position.y = boardTop + 0.6;
    torso.castShadow = true;
    this.tiltGroup.add(torso);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 8, 6),
      new THREE.MeshStandardMaterial({ color: colors.helmet, roughness: 0.7, flatShading: true }),
    );
    head.position.y = boardTop + 1.15;
    head.castShadow = true;
    this.tiltGroup.add(head);
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
  }

  sync(position: THREE.Vector3, heading: number, tilt = 0, pitch = 0, roll = 0, lean = 0): void {
    this.group.position.copy(position);
    this.group.rotation.y = heading;
    // pitch = front/backflip, roll + tilt = roll / crash fall, lean = carve
    this.tiltGroup.rotation.set(pitch, 0, roll + tilt + lean);
  }
}
