import { onLanguageChange, t } from './I18n';

export interface RunResult {
  time: string;
  score: number;
  maxSpeedKmh: number;
  gates: number;
  tricks: number;
  maxCombo: number;
}

const ROWS: ReadonlyArray<[string, string]> = [
  ['time', 'result.time'],
  ['score', 'result.score'],
  ['speed', 'result.speed'],
  ['gates', 'result.gates'],
  ['tricks', 'result.tricks'],
  ['combo', 'result.combo'],
];

/**
 * End-of-run overlay. HTML/CSS only; it never touches physics or game logic.
 */
export class ResultScreen {
  private readonly root: HTMLDivElement;
  private readonly titleEl: HTMLHeadingElement;
  private readonly againEl: HTMLButtonElement;
  private onPlayAgain: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'result-screen';
    this.root.innerHTML = `
      <div class="result-panel">
        <h1 data-result="title"></h1>
        <div class="result-rows">
          ${ROWS.map(
            ([field]) =>
              `<div class="result-row"><span data-label="${field}"></span><span data-field="${field}"></span></div>`,
          ).join('')}
        </div>
        <button type="button" class="result-button" data-action="again"></button>
      </div>
    `;
    container.appendChild(this.root);

    this.titleEl = this.root.querySelector('[data-result="title"]') as HTMLHeadingElement;
    this.againEl = this.root.querySelector('[data-action="again"]') as HTMLButtonElement;
    this.againEl.addEventListener('click', () => this.onPlayAgain?.());

    this.renderLabels();
    onLanguageChange(() => this.renderLabels());
  }

  private renderLabels(): void {
    this.titleEl.textContent = t('result.title');
    this.againEl.textContent = t('result.again');
    for (const [field, key] of ROWS) {
      const el = this.root.querySelector(`[data-label="${field}"]`);
      if (el) el.textContent = t(key);
    }
  }

  show(result: RunResult, onPlayAgain: () => void): void {
    this.onPlayAgain = onPlayAgain;
    this.renderLabels();
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
