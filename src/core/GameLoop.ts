export type UpdateFn = (dt: number) => void;

/**
 * Drives the frame loop with a fixed physics timestep and an accumulator,
 * so simulation is independent from display refresh rate.
 */
export class GameLoop {
  private readonly fixedStep: number;
  private readonly maxSubSteps: number;
  private readonly maxFrameDelta: number;
  private readonly onFixedUpdate: UpdateFn;
  private readonly onRenderUpdate: UpdateFn;

  private accumulator = 0;
  private lastTime = 0;
  private rafId = 0;
  private running = false;

  constructor(
    fixedStep: number,
    maxSubSteps: number,
    maxFrameDelta: number,
    onFixedUpdate: UpdateFn,
    onRenderUpdate: UpdateFn,
  ) {
    this.fixedStep = fixedStep;
    this.maxSubSteps = maxSubSteps;
    this.maxFrameDelta = maxFrameDelta;
    this.onFixedUpdate = onFixedUpdate;
    this.onRenderUpdate = onRenderUpdate;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private readonly tick = (now: number): void => {
    if (!this.running) return;

    let delta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (delta > this.maxFrameDelta) delta = this.maxFrameDelta;
    this.accumulator += delta;

    let steps = 0;
    while (this.accumulator >= this.fixedStep && steps < this.maxSubSteps) {
      this.onFixedUpdate(this.fixedStep);
      this.accumulator -= this.fixedStep;
      steps++;
    }
    // Drop the backlog instead of spiralling when the tab was throttled.
    if (steps === this.maxSubSteps) this.accumulator = 0;

    this.onRenderUpdate(delta);
    this.rafId = requestAnimationFrame(this.tick);
  };
}
