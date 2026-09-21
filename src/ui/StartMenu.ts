/** Title / start overlay. The PLAY click also unlocks the audio context. */
export class StartMenu {
  private readonly root: HTMLDivElement;
  private readonly bestEl: HTMLParagraphElement;
  private onStart: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'start-menu';
    this.root.innerHTML = `
      <div class="menu-panel">
        <h1 class="menu-title">SNOWRUSH</h1>
        <p class="menu-subtitle">LOW-POLY SNOWBOARDING</p>
        <p class="menu-best"></p>
        <button type="button" class="menu-button" data-action="play">PLAY</button>
        <div class="menu-controls">
          <div><span>W / ↑</span>加速</div>
          <div><span>A / D</span>转向</div>
          <div><span>S / ↓</span>刹车</div>
          <div><span>SPACE</span>跳跃</div>
          <div><span>空中 W / S</span>前后空翻</div>
          <div><span>空中 A / D</span>转体</div>
          <div><span>R</span>重置</div>
          <div><span>P / ESC</span>暂停</div>
        </div>
      </div>
    `;
    container.appendChild(this.root);

    this.bestEl = this.root.querySelector('.menu-best') as HTMLParagraphElement;
    const button = this.root.querySelector('[data-action="play"]') as HTMLButtonElement;
    button.addEventListener('click', () => this.onStart?.());
  }

  show(bestScore: number, onStart: () => void): void {
    this.onStart = onStart;
    this.bestEl.textContent = bestScore > 0 ? `BEST ${bestScore.toLocaleString('en-US')}` : '';
    this.root.classList.add('is-visible');
  }

  hide(): void {
    this.root.classList.remove('is-visible');
    this.onStart = null;
  }
}
