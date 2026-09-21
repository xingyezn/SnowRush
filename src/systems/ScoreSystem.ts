import { CONFIG } from '../core/Config';

/**
 * Run scoring. Gate score exists in V0.2; trick score / combo are filled in by
 * the V0.3 TrickSystem through the same API.
 */
export class ScoreSystem {
  private score = 0;
  private gates = 0;
  private tricks = 0;
  private maxCombo = 1;

  addGate(): void {
    this.gates += 1;
    this.score += CONFIG.score.gateScore;
  }

  addTrick(points: number, combo: number): void {
    this.tricks += 1;
    this.score += points;
    if (combo > this.maxCombo) this.maxCombo = combo;
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

  getMaxCombo(): number {
    return this.maxCombo;
  }

  reset(): void {
    this.score = 0;
    this.gates = 0;
    this.tricks = 0;
    this.maxCombo = 1;
  }
}
