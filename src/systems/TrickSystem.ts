import { CONFIG } from '../core/Config';
import type { Player } from '../player/Player';

const TAU = Math.PI * 2;

export type LandingQuality = 'safe' | 'hard' | 'crash';

export interface Trick {
  name: string;
  score: number;
}

export interface LandingResult {
  tricks: Trick[];
  baseScore: number;
  /** Degrees away from upright at touchdown. */
  landingAngle: number;
  quality: LandingQuality;
}

export interface TrickHandlers {
  onLanded(result: LandingResult): void;
}

/** Wraps an angle into (-pi, pi]. */
export function wrapPi(angle: number): number {
  let a = angle % TAU;
  if (a > Math.PI) a -= TAU;
  else if (a < -Math.PI) a += TAU;
  return a;
}

/**
 * Landing angle (degrees off upright) and quality from the board orientation.
 * Spins (yaw) do not affect the landing; only pitch and roll do.
 */
export function evaluateLanding(pitch: number, roll: number): { angle: number; quality: LandingQuality } {
  const angle = ((Math.abs(wrapPi(pitch)) + Math.abs(wrapPi(roll))) * 180) / Math.PI;
  const c = CONFIG.trick;
  const quality: LandingQuality =
    angle < c.safeLandingAngle ? 'safe' : angle < c.hardLandingAngle ? 'hard' : 'crash';
  return { angle, quality };
}

/**
 * Maps accumulated pitch (flips) and yaw (spins) to named tricks.
 * Pitch is negative for frontflips, positive for backflips.
 */
export function recognizeTricks(pitch: number, yaw: number): Trick[] {
  const c = CONFIG.trick;
  const tricks: Trick[] = [];

  const flipCount = Math.min(Math.round(Math.abs(pitch) / TAU), c.flipScore.length - 1);
  if (flipCount >= 1) {
    const direction = pitch < 0 ? 'Frontflip' : 'Backflip';
    const name =
      flipCount === 1
        ? direction
        : flipCount === 2
          ? `Double ${direction}`
          : `${flipCount}x ${direction}`;
    tricks.push({ name, score: c.flipScore[flipCount] });
  }

  const spinCount = Math.min(Math.round(Math.abs(yaw) / TAU), c.spinScore.length - 1);
  if (spinCount >= 1) {
    tricks.push({ name: `${spinCount * 360}`, score: c.spinScore[spinCount] });
  }

  return tricks;
}

/**
 * Watches the player's air rotation, recognises tricks and evaluates the
 * landing. Tricks are only reported on touchdown; a mid-air crash cancels them.
 */
export class TrickSystem {
  private readonly player: Player;
  private readonly handlers: TrickHandlers;
  private wasAirborne = false;

  constructor(player: Player, handlers: TrickHandlers) {
    this.player = player;
    this.handlers = handlers;
  }

  /** Call once per fixed step, after the controller / physics update. */
  update(): void {
    const airborne = !this.player.grounded;
    if (this.wasAirborne && !airborne) this.evaluateLanding();
    this.wasAirborne = airborne;
  }

  /** Discards the pending air (used when the player crashes mid-air). */
  cancel(): void {
    this.wasAirborne = false;
    this.player.resetAirRotations();
  }

  private evaluateLanding(): void {
    const p = this.player;
    // Terrain grazing is neither a trick nor a crash.
    if (!p.airControlEnabled) return;
    if (p.airTime < CONFIG.trick.minAirTime) return;

    const { angle, quality } = evaluateLanding(p.airRotationX, p.airRotationZ);
    const tricks = recognizeTricks(p.airRotationX, p.airRotationY);
    const baseScore = tricks.reduce((sum, trick) => sum + trick.score, 0);
    this.handlers.onLanded({ tricks, baseScore, landingAngle: angle, quality });
  }
}
