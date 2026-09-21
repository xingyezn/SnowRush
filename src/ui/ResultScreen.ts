export interface RunResult {
  time: string;
  score: number;
  maxSpeedKmh: number;
  gates: number;
  tricks: number;
  maxCombo: number;
}

/**
 * End-of-run overlay. HTML/CSS only; it never touches physics or game logic.
 */
export class ResultScreen {
  private readonly root: HTMLDivElement;
  private onPlayAgain: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'result-screen';
    this.root.innerHTML = `
      <div class="result-panel">
        <h1>RUN COMPLETE</h1>
        <div class="result-rows">
          <div class="result-row"><span>TIME</span><span data-field="time">00:00</span></div>
          <div class="result-row"><span>SCORE</span><span data-field="score">0</span></div>
          <div class="result-row"><span>MAX SPEED</span><span data-field="speed">0 KM/H</span></div>
          <div class="result-row"><span>GATES</span><span data-field="gates">0</span></div>
          <div class="result-row"><span>TRICKS</span><span data-field="tricks">0</span></div>
          <div class="result-row"><span>MAX COMBO</span><span data-field="combo">×1</span></div>
        </div>
        <button type="button" class="result-button">PLAY AGAIN</button>
      </div>
    `;
    container.appendChild(this.root);

    const button = this.root.querySelector('.result-button') as HTMLButtonElement;
    button.addEventListener('click', () => this.onPlayAgain?.());
  }

  show(result: RunResult, onPlayAgain: () => void): void {
    this.onPlayAgain = onPlayAgain;
    this.setField('time', result.time);
    this.setField('score', result.score.toLocaleString('en-US'));
    this.setField('speed', `${Math.round(result.maxSpeedKmh)} KM/H`);
    this.setField('gates', String(result.gates));
    this.setField('tricks', String(result.tricks));
    this.setField('combo', `×${result.maxCombo}`);
    this.root.classList.add('is-visible');
  }

  hide(): void {
    this.root.classList.remove('is-visible');
    this.onPlayAgain = null;
  }

  private setField(name: string, value: string): void {
    const el = this.root.querySelector(`[data-field="${name}"]`);
    if (el) el.textContent = value;
  }
}
