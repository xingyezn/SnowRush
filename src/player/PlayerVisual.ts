import * as THREE from 'three';
import { CONFIG } from '../core/Config';

/**
 * Low-poly player made only from primitive geometry (no external models).
 * Reads player state; never drives physics.
 *
 * Structure: outer group holds position + heading, inner group holds the crash
 * roll so the two never interfere.
 */
export class PlayerVisual {
  readonly group = new THREE.Group();

  private readonly tiltGroup = new THREE.Group();

  constructor() {
    const p = CONFIG.player;
    const colors = CONFIG.colors;
    const boardTop = -(p.capsuleHalfHeight + p.capsuleRadius) + 0.04;

    this.group.add(this.tiltGroup);

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.07, 1.7),
      new THREE.MeshStandardMaterial({ color: colors.board, roughness: 0.55, flatShading: true }),
    );
    board.position.y = boardTop;
    board.castShadow = true;
    this.tiltGroup.add(board);

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.2, 0.5, 4, 8),
      new THREE.MeshStandardMaterial({ color: colors.jacket, roughness: 0.85, flatShading: true }),
    );
    torso.position.y = -0.25;
    torso.castShadow = true;
    this.tiltGroup.add(torso);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 8, 6),
      new THREE.MeshStandardMaterial({ color: colors.helmet, roughness: 0.7, flatShading: true }),
    );
    head.position.y = 0.3;
    head.castShadow = true;
    this.tiltGroup.add(head);
  }

  sync(position: THREE.Vector3, heading: number, tilt = 0, pitch = 0, roll = 0, lean = 0): void {
    this.group.position.copy(position);
    this.group.rotation.y = heading;
    // pitch = front/backflip, roll + tilt = roll / crash fall, lean = carve
    this.tiltGroup.rotation.set(pitch, 0, roll + tilt + lean);
  }
}
