import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import type { Player } from '../player/Player';
import type { ScoreSystem } from './ScoreSystem';
import type { ItemField, ItemType } from '../world/Items';

export type EffectName = 'boost' | 'shield' | 'magnet' | 'slowmo' | 'invincible';

export interface ActiveEffect {
  name: EffectName;
  remaining: number;
}

/**
 * Applies collectible effects and tracks their timers. Boost raises the speed
 * cap; shield absorbs one crash; magnet auto-collects nearby items; slow-mo
 * lowers gravity while airborne; invincible ignores obstacles.
 */
export class ItemSystem {
  private readonly player: Player;
  private readonly field: ItemField;
  private readonly score: ScoreSystem;
  private readonly onCollect: (type: ItemType) => void;
  private readonly pos = new THREE.Vector3();

  private boost = 0;
  private shield = false;
  private magnet = 0;
  private slowmo = 0;
  private invincible = 0;

  constructor(
    player: Player,
    field: ItemField,
    score: ScoreSystem,
    onCollect: (type: ItemType) => void,
  ) {
    this.player = player;
    this.field = field;
    this.score = score;
    this.onCollect = onCollect;
  }

  reset(): void {
    this.boost = 0;
    this.shield = false;
    this.magnet = 0;
    this.slowmo = 0;
    this.invincible = 0;
    this.player.body.setGravityScale(1, true);
  }

  collect(index: number): void {
    const item = this.field.items[index];
    if (!item || !item.active) return;
    this.field.deactivate(index);
    const fx = CONFIG.itemEffects;
    switch (item.type) {
      case 'boost':
        this.boost = fx.boostDuration;
        this.applyBoostImpulse();
        break;
      case 'score':
        this.score.addBonus(fx.scoreValue);
        break;
      case 'shield':
        this.shield = true;
        break;
      case 'magnet':
        this.magnet = fx.magnetDuration;
        break;
      case 'slowmo':
        this.slowmo = fx.slowmoDuration;
        break;
      case 'invincible':
        this.invincible = fx.invincibleDuration;
        break;
    }
    this.onCollect(item.type);
  }

  update(dt: number): void {
    this.boost = Math.max(0, this.boost - dt);
    this.magnet = Math.max(0, this.magnet - dt);
    this.slowmo = Math.max(0, this.slowmo - dt);
    this.invincible = Math.max(0, this.invincible - dt);

    this.player.body.setGravityScale(this.slowmo > 0 && !this.player.grounded ? CONFIG.itemEffects.slowmoGravity : 1, true);

    if (this.magnet > 0) {
      this.player.getPosition(this.pos);
      const radius = CONFIG.itemEffects.magnetRadius;
      for (let i = 0; i < this.field.items.length; i++) {
        if (!this.field.items[i].active) continue;
        if (this.field.distanceTo(i, this.pos) < radius) this.collect(i);
      }
    }
  }

  isBoost(): boolean {
    return this.boost > 0;
  }

  getSpeedMultiplier(): number {
    return this.boost > 0 ? CONFIG.itemEffects.boostFactor : 1;
  }

  isInvincible(): boolean {
    return this.invincible > 0;
  }

  /** Consumes the shield if held; returns true if a crash was absorbed. */
  consumeShield(): boolean {
    if (!this.shield) return false;
    this.shield = false;
    return true;
  }

  getActive(): ActiveEffect[] {
    const out: ActiveEffect[] = [];
    if (this.boost > 0) out.push({ name: 'boost', remaining: this.boost });
    if (this.shield) out.push({ name: 'shield', remaining: Number.POSITIVE_INFINITY });
    if (this.magnet > 0) out.push({ name: 'magnet', remaining: this.magnet });
    if (this.slowmo > 0) out.push({ name: 'slowmo', remaining: this.slowmo });
    if (this.invincible > 0) out.push({ name: 'invincible', remaining: this.invincible });
    return out;
  }

  private applyBoostImpulse(): void {
    const heading = this.player.heading;
    const v = this.player.body.linvel();
    const s = CONFIG.itemEffects.boostImpulse;
    this.player.body.setLinvel(
      { x: v.x - Math.sin(heading) * s, y: v.y, z: v.z - Math.cos(heading) * s },
      true,
    );
  }
}
