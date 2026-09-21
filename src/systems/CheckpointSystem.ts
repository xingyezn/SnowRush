import { CONFIG } from '../core/Config';
import type { Player, SpawnPoint } from '../player/Player';
import type { Checkpoint } from '../world/Checkpoint';
import { terrainHeight } from '../world/TerrainHeight';

/**
 * Tracks the latest checkpoint and owns the player's respawn point.
 */
export class CheckpointSystem {
  private readonly player: Player;
  private respawn: SpawnPoint;
  private lastIndex = -1;

  constructor(player: Player, initialSpawn: SpawnPoint) {
    this.player = player;
    this.respawn = { ...initialSpawn };
    this.player.setSpawn(this.respawn);
  }

  get lastCheckpointIndex(): number {
    return this.lastIndex;
  }

  /** Clears progress and moves the respawn point back to the start. */
  reset(initialSpawn: SpawnPoint): void {
    this.lastIndex = -1;
    this.respawn = { ...initialSpawn };
    this.player.setSpawn(this.respawn);
  }

  setCheckpoint(index: number, checkpoint: Checkpoint): void {
    const p = CONFIG.player;
    this.lastIndex = index;
    this.respawn = {
      x: checkpoint.x,
      y: terrainHeight(checkpoint.x, checkpoint.z) + p.capsuleHalfHeight + p.capsuleRadius + 0.3,
      z: checkpoint.z,
      heading: 0,
    };
    this.player.setSpawn(this.respawn);
  }

  respawnPlayer(): void {
    this.player.respawn();
  }
}
