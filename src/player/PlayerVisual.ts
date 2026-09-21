import * as THREE from 'three';
import { CONFIG } from '../core/Config';

/**
 * Low-poly player made only from primitive geometry (no external models).
 * Reads player state; never drives physics.
 */
export class PlayerVisual {
  readonly group = new THREE.Group();

  constructor() {
    const p = CONFIG.player;
    const colors = CONFIG.colors;
    const boardTop = -(p.capsuleHalfHeight + p.capsuleRadius) + 0.04;

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.07, 1.7),
      new THREE.MeshStandardMaterial({ color: colors.board, roughness: 0.55, flatShading: true }),
    );
    board.position.y = boardTop;
    board.castShadow = true;
    this.group.add(board);

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.2, 0.5, 4, 8),
      new THREE.MeshStandardMaterial({ color: colors.jacket, roughness: 0.85, flatShading: true }),
    );
    torso.position.y = -0.25;
    torso.castShadow = true;
    this.group.add(torso);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 8, 6),
      new THREE.MeshStandardMaterial({ color: colors.helmet, roughness: 0.7, flatShading: true }),
    );
    head.position.y = 0.3;
    head.castShadow = true;
    this.group.add(head);
  }

  sync(position: THREE.Vector3, heading: number): void {
    this.group.position.copy(position);
    this.group.rotation.y = heading;
  }
}
