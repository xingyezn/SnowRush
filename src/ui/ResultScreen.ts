import { onLanguageChange, t } from './I18n';
import { playUiSound } from './UiSound';
import type { RecordOutcome } from '../core/Stats';
import { prefersReducedMotion } from '../core/Platform';

export interface RunResult {
  time: string;
  score: number;
  maxSpeedKmh: number;
  gates: number;
  tricks: number;
  maxCombo: number;
  rank?: string;
  newBest?: boolean;
  records?: RecordOutcome;
  newAchievements?: string[];
  dailyCompleted?: boolean;
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
 * End-of-run overlay with rank, NEW BEST, per-stat record stars and any
 * achievements unlocked by the run. HTML/CSS only.
 */
export class ResultScreen {
  private readonly root: HTMLDivElement;
  private readonly titleEl: HTMLHeadingElement;
  private readonly rankEl: HTMLDivElement;
  private readonly newBestEl: HTMLDivElement;
  private readonly againEl: HTMLButtonElement;
  private readonly achEl: HTMLDivElement;
  private readonly achTitleEl: HTMLDivElement;
  private readonly achListEl: HTMLDivElement;
  private readonly dailyEl: HTMLDivElement;
  private onPlayAgain: (() => void) | null = null;
  private onQuit: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'result-screen';
    this.root.innerHTML = `
      <div class="result-panel">
        <div class="result-head">
          <h1 data-result="title"></h1>
          <div class="result-rank" data-result="rank" hidden></div>
        </div>
        <div class="result-newbest" data-result="newbest" hidden></div>
        <div class="result-daily" data-result="daily" hidden></div>
        <div class="result-rows">
          ${ROWS.map(
            ([field]) =>
              `<div class="result-row"><span data-label="${field}"></span><span data-field="${field}"></span></div>`,
          ).join('')}
        </div>
        <div class="result-achievements" data-result="achievements" hidden>
          <div class="result-achievements-title" data-result="achTitle"></div>
          <div class="result-achievements-list" data-result="achList"></div>
        </div>
        <button type="button" class="result-button" data-action="again"></button>
        <button type="button" class="result-button result-button--ghost" data-action="quit"></button>
      </div>
    `;
    container.appendChild(this.root);

    this.titleEl = this.root.querySelector('[data-result="title"]') as HTMLHeadingElement;
    this.rankEl = this.root.querySelector('[data-result="rank"]') as HTMLDivElement;
    this.newBestEl = this.root.querySelector('[data-result="newbest"]') as HTMLDivElement;
    this.againEl = this.root.querySelector('[data-action="again"]') as HTMLButtonElement;
    this.achEl = this.root.querySelector('[data-result="achievements"]') as HTMLDivElement;
    this.achTitleEl = this.root.querySelector('[data-result="achTitle"]') as HTMLDivElement;
    this.achListEl = this.root.querySelector('[data-result="achList"]') as HTMLDivElement;
    this.dailyEl = this.root.querySelector('[data-result="daily"]') as HTMLDivElement;
    const quitEl = this.root.querySelector('[data-action="quit"]') as HTMLButtonElement;

    this.againEl.addEventListener('click', () => {
      playUiSound('click');
      this.onPlayAgain?.();
    });
    quitEl.addEventListener('click', () => {
      playUiSound('back');
      this.onQuit?.();
    });

    this.renderLabels();
    onLanguageChange(() => this.renderLabels());
  }

  private renderLabels(): void {
    this.titleEl.textContent = t('result.title');
    this.againEl.textContent = t('result.again');
    const quitEl = this.root.querySelector('[data-action="quit"]');
    if (quitEl) quitEl.textContent = t('pause.quit');
    this.newBestEl.textContent = t('result.newbest');
    this.dailyEl.textContent = `${t('daily.title')} ✓`;
    this.achTitleEl.textContent = t('result.achievements');
    for (const [field, key] of ROWS) {
      const el = this.root.querySelector(`[data-label="${field}"]`);
      if (el) el.innerHTML = t(key);
    }
  }

  show(result: RunResult, onPlayAgain: () => void, onQuit: () => void): void {
    this.onPlayAgain = onPlayAgain;
    this.onQuit = onQuit;
    this.renderLabels();

    if (result.rank) {
      this.rankEl.textContent = result.rank;
      this.rankEl.hidden = false;
    } else {
      this.rankEl.hidden = true;
    }
    this.newBestEl.hidden = !result.newBest;
    this.dailyEl.hidden = !result.dailyCompleted;

    const reduce = prefersReducedMotion();
    this.animateTime(result.time, reduce);
    this.animateCount('score', result.score, (v) => v.toLocaleString('en-US'), reduce);
    this.animateCount('speed', Math.round(result.maxSpeedKmh), (v) => `${v} KM/H`, reduce);
    this.animateCount('gates', result.gates, String, reduce);
    this.animateCount('tricks', result.tricks, String, reduce);
    this.animateCount('combo', result.maxCombo, (v) => `×${v}`, reduce);

    // Star any stat that set a personal record this run.
    const records = result.records;
    const stars: Array<[string, boolean | undefined]> = [
      ['time', records?.time],
      ['score', records?.score],
      ['speed', records?.speed],
      ['combo', records?.combo],
    ];
    for (const [field, isRecord] of stars) {
      if (!isRecord) continue;
      const el = this.root.querySelector(`[data-label="${field}"]`);
      if (el) el.insertAdjacentHTML('beforeend', ' <em class="result-star">★</em>');
    }

    const achievements = result.newAchievements ?? [];
    this.achEl.hidden = achievements.length === 0;
    this.achListEl.innerHTML = achievements
      .map((id) => `<span class="result-ach">${t(`ach.${id}.name`)}</span>`)
      .join('');

    this.root.classList.add('is-visible');
  }

  hide(): void {
    this.root.classList.remove('is-visible');
    this.onPlayAgain = null;
    this.onQuit = null;
  }

  private animateCount(
    name: string,
    to: number,
    format: (value: number) => string,
    reduce: boolean,
  ): void {
    const el = this.root.querySelector(`[data-field="${name}"]`);
    if (!el) return;
    if (reduce || to <= 0) {
      el.textContent = format(to);
      return;
    }
    const duration = 650;
    const start = performance.now();
    const tick = (now: number): void => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(Math.round(to * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private animateTime(time: string, reduce: boolean): void {
    const el = this.root.querySelector('[data-field="time"]');
    if (!el) return;
    const [minutes, seconds] = time.split(':').map(Number);
    const total = (minutes || 0) * 60 + (seconds || 0);
    if (reduce || total <= 0) {
      el.textContent = time;
      return;
    }
    const format = (value: number): string =>
      `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
    const duration = 650;
    const start = performance.now();
    const tick = (now: number): void => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(total * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
