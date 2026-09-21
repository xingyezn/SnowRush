/** Run timer. Pauses and finish lock it via start/stop. */
export class Timer {
  private elapsed = 0;
  private running = false;

  reset(): void {
    this.elapsed = 0;
    this.running = false;
  }

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  update(dt: number): void {
    if (this.running) this.elapsed += dt;
  }

  getElapsed(): number {
    return this.elapsed;
  }

  format(): string {
    const total = Math.floor(this.elapsed);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}
