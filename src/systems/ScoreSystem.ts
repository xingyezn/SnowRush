import { CONFIG } from '../core/Config';

export interface TrickAward {
  points: number;
  multiplier: number;
}

/**
 * Run scoring: gate score, trick score and the combo streak.
 * Combo resets on a crash; every successful trick raises the multiplier.
 */
export class ScoreSystem {
  private score = 0;
  private gates = 0;
  private tricks = 0;
  private comboStreak = 0;
  private maxCombo = 1;

  addGate(): void {
    this.gates += 1;
    this.score += CONFIG.score.gateScore;
  }

  addTrick(baseScore: number): TrickAward {
    this.tricks += 1;
    this.comboStreak += 1;
    const multipliers = CONFIG.trick.comboMultipliers;
    const multiplier = multipliers[Math.min(this.comboStreak - 1, multipliers.length - 1)];
    const points = Math.round(baseScore * multiplier);
    this.score += points;
    if (this.comboStreak > this.maxCombo) this.maxCombo = this.comboStreak;
    return { points, multiplier };
  }

  resetCombo(): void {
    this.comboStreak = 0;
  }

  getScore(): number {
    return this.score;
  }

  getGateCount(): number {
    return this.gates;
  }

  getTrickCount(): number {
    return this.tricks;
  }

  getComboStreak(): number {
    return this.comboStreak;
  }

  getMaxCombo(): number {
    return this.maxCombo;
  }

  reset(): void {
    this.score = 0;
    this.gates = 0;
    this.tricks = 0;
    this.comboStreak = 0;
    this.maxCombo = 1;
  }
}
