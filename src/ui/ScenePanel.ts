import { CONFIG } from '../core/Config';
import { currentSceneOverrides } from '../core/SceneOverrides';

export interface SceneHandlers {
  onClouds(): void;
  onBalloons(): void;
  onSun(): void;
  onMountains(): void;
  onCliffs(): void;
  onCourse(): void;
  /** Persists scene + character tuning (writes scene.json or downloads it). */
  onSave(): Promise<boolean>;
}

type Group = 'onClouds' | 'onBalloons' | 'onSun' | 'onMountains' | 'onCliffs' | 'onCourse';

interface Control {
  group: Group;
  label: string;
  min: number;
  max: number;
  step: number;
  get(): number;
  set(value: number): void;
  /** Rebuild live on every input (cheap) vs. on release (heavier). */
  live?: boolean;
}

const CONTROLS: Control[] = [
  { group: 'onClouds', label: '云 高度低', min: -600, max: 600, step: 5, get: () => CONFIG.clouds.minHeight, set: (v) => (CONFIG.clouds.minHeight = v), live: true },
  { group: 'onClouds', label: '云 高度高', min: -600, max: 1400, step: 5, get: () => CONFIG.clouds.maxHeight, set: (v) => (CONFIG.clouds.maxHeight = v), live: true },
  { group: 'onClouds', label: '云 半径近', min: 200, max: 4000, step: 50, get: () => CONFIG.clouds.minRadius, set: (v) => (CONFIG.clouds.minRadius = v), live: true },
  { group: 'onClouds', label: '云 半径远', min: 400, max: 5000, step: 50, get: () => CONFIG.clouds.maxRadius, set: (v) => (CONFIG.clouds.maxRadius = v), live: true },
  { group: 'onClouds', label: '云 大小小', min: 10, max: 300, step: 5, get: () => CONFIG.clouds.minScale, set: (v) => (CONFIG.clouds.minScale = v), live: true },
  { group: 'onClouds', label: '云 大大小', min: 10, max: 400, step: 5, get: () => CONFIG.clouds.maxScale, set: (v) => (CONFIG.clouds.maxScale = v), live: true },
  { group: 'onClouds', label: '云 数量', min: 0, max: 60, step: 1, get: () => CONFIG.clouds.count, set: (v) => (CONFIG.clouds.count = v) },

  { group: 'onBalloons', label: '气球 数量', min: 0, max: 40, step: 1, get: () => CONFIG.balloons.count, set: (v) => (CONFIG.balloons.count = v) },
  { group: 'onBalloons', label: '气球 高度低', min: -200, max: 1200, step: 5, get: () => CONFIG.balloons.minHeight, set: (v) => (CONFIG.balloons.minHeight = v), live: true },
  { group: 'onBalloons', label: '气球 高度高', min: -200, max: 1600, step: 5, get: () => CONFIG.balloons.maxHeight, set: (v) => (CONFIG.balloons.maxHeight = v), live: true },
  { group: 'onBalloons', label: '气球 半径近', min: 200, max: 4000, step: 50, get: () => CONFIG.balloons.minRadius, set: (v) => (CONFIG.balloons.minRadius = v), live: true },
  { group: 'onBalloons', label: '气球 半径远', min: 400, max: 5000, step: 50, get: () => CONFIG.balloons.maxRadius, set: (v) => (CONFIG.balloons.maxRadius = v), live: true },
  { group: 'onBalloons', label: '气球 速度', min: 0, max: 40, step: 1, get: () => CONFIG.balloons.speed, set: (v) => (CONFIG.balloons.speed = v), live: true },
  { group: 'onBalloons', label: '气球 大小小', min: 0.2, max: 4, step: 0.1, get: () => CONFIG.balloons.minScale, set: (v) => (CONFIG.balloons.minScale = v), live: true },
  { group: 'onBalloons', label: '气球 大大小', min: 0.2, max: 6, step: 0.1, get: () => CONFIG.balloons.maxScale, set: (v) => (CONFIG.balloons.maxScale = v), live: true },

  { group: 'onSun', label: '太阳 方位', min: 0, max: 360, step: 1, get: () => CONFIG.sun.azimuth, set: (v) => (CONFIG.sun.azimuth = v), live: true },
  { group: 'onSun', label: '太阳 仰角', min: 0, max: 60, step: 1, get: () => CONFIG.sun.elevation, set: (v) => (CONFIG.sun.elevation = v), live: true },
  { group: 'onSun', label: '太阳 大小', min: 40, max: 600, step: 5, get: () => CONFIG.sun.size, set: (v) => (CONFIG.sun.size = v), live: true },
  { group: 'onSun', label: '太阳 距离', min: 1500, max: 5800, step: 50, get: () => CONFIG.sun.distance, set: (v) => (CONFIG.sun.distance = v), live: true },
  { group: 'onSun', label: '光 X', min: -600, max: 600, step: 5, get: () => CONFIG.light.sunOffsetX, set: (v) => (CONFIG.light.sunOffsetX = v), live: true },
  { group: 'onSun', label: '光 Y', min: 20, max: 800, step: 5, get: () => CONFIG.light.sunOffsetY, set: (v) => (CONFIG.light.sunOffsetY = v), live: true },
  { group: 'onSun', label: '光 Z', min: -600, max: 600, step: 5, get: () => CONFIG.light.sunOffsetZ, set: (v) => (CONFIG.light.sunOffsetZ = v), live: true },

  { group: 'onMountains', label: '远山 数量', min: 0, max: 120, step: 1, get: () => CONFIG.mountains.count, set: (v) => (CONFIG.mountains.count = v) },
  { group: 'onMountains', label: '远山 半径近', min: 1800, max: 5600, step: 50, get: () => CONFIG.mountains.minRadius, set: (v) => (CONFIG.mountains.minRadius = v), live: true },
  { group: 'onMountains', label: '远山 半径远', min: 1800, max: 6000, step: 50, get: () => CONFIG.mountains.maxRadius, set: (v) => (CONFIG.mountains.maxRadius = v), live: true },
  { group: 'onMountains', label: '远山 高度', min: 300, max: 2000, step: 25, get: () => CONFIG.mountains.farHeight, set: (v) => (CONFIG.mountains.farHeight = v), live: true },
  { group: 'onMountains', label: '远山 基高', min: -1200, max: 0, step: 25, get: () => CONFIG.mountains.baseY, set: (v) => (CONFIG.mountains.baseY = v), live: true },

  { group: 'onCliffs', label: '岩壁 最小', min: 0.2, max: 4, step: 0.1, get: () => CONFIG.course.cliffs.scaleMin, set: (v) => (CONFIG.course.cliffs.scaleMin = v), live: true },
  { group: 'onCliffs', label: '岩壁 最大', min: 0.2, max: 6, step: 0.1, get: () => CONFIG.course.cliffs.scaleMax, set: (v) => (CONFIG.course.cliffs.scaleMax = v), live: true },

  { group: 'onCourse', label: '树 数量', min: 0, max: 400, step: 5, get: () => CONFIG.course.trees.count, set: (v) => (CONFIG.course.trees.count = v) },
  { group: 'onCourse', label: '岩石 数量', min: 0, max: 200, step: 5, get: () => CONFIG.course.rocks.count, set: (v) => (CONFIG.course.rocks.count = v) },
  { group: 'onCourse', label: '草 数量', min: 0, max: 400, step: 5, get: () => CONFIG.course.bushes.count, set: (v) => (CONFIG.course.bushes.count = v) },
  { group: 'onCourse', label: '雪堆 数量', min: 0, max: 200, step: 5, get: () => CONFIG.course.snowpiles.count, set: (v) => (CONFIG.course.snowpiles.count = v) },
  { group: 'onCourse', label: '内岩壁 数量', min: 0, max: 120, step: 2, get: () => CONFIG.course.innerCliffs.count, set: (v) => (CONFIG.course.innerCliffs.count = v) },
  { group: 'onCourse', label: '道具 数量', min: 0, max: 200, step: 5, get: () => CONFIG.items.count, set: (v) => (CONFIG.items.count = v) },
];

const GROUP_LABELS: Record<Group, string> = {
  onClouds: '云',
  onBalloons: '热气球',
  onSun: '太阳 / 光照',
  onMountains: '远山',
  onCliffs: '两侧岩壁',
  onCourse: '赛道物件（改动后重建）',
};

/**
 * Scene tuning panel for the admin view (`?admin=1`). Edits Config values and
 * rebuilds the affected scene systems live, so the shipped look can be dialled
 * in from the browser.
 */
export class ScenePanel {
  private readonly handlers: SceneHandlers;
  private readonly pending = new Set<Group>();
  private timer: number | null = null;
  private out: HTMLTextAreaElement | null = null;
  private status: HTMLDivElement | null = null;
  private statusTimer: number | null = null;
  private rootEl: HTMLDivElement | null = null;

  setVisible(visible: boolean): void {
    if (this.rootEl) this.rootEl.style.display = visible ? '' : 'none';
  }

  constructor(parent: HTMLElement, handlers: SceneHandlers) {
    this.handlers = handlers;

    const root = document.createElement('div');
    this.rootEl = root;
    Object.assign(root.style, {
      position: 'fixed',
      left: '12px',
      bottom: '12px',
      zIndex: '9999',
      width: '320px',
      maxHeight: '46vh',
      overflowY: 'auto',
      padding: '12px',
      borderRadius: '10px',
      background: 'rgba(15,23,33,0.9)',
      color: '#e8f0fa',
      font: '12px/1.5 ui-monospace, Consolas, monospace',
      boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
      userSelect: 'none',
    } satisfies Partial<CSSStyleDeclaration>);

    const header = document.createElement('div');
    Object.assign(header.style, { display: 'flex', alignItems: 'center', marginBottom: '8px' });
    const title = document.createElement('div');
    title.textContent = '场景编辑';
    Object.assign(title.style, { fontWeight: '700', flex: '1' });
    header.appendChild(title);
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    Object.assign(close.style, {
      border: 'none', background: 'transparent', color: '#dce8f6', fontSize: '16px',
      lineHeight: '1', padding: '0 4px', cursor: 'pointer',
    });
    close.addEventListener('click', () => this.setVisible(false));
    header.appendChild(close);
    root.appendChild(header);

    let currentGroup: Group | null = null;
    for (const control of CONTROLS) {
      if (control.group !== currentGroup) {
        currentGroup = control.group;
        const heading = document.createElement('div');
        heading.textContent = GROUP_LABELS[control.group];
        Object.assign(heading.style, { marginTop: '8px', opacity: '0.65' });
        root.appendChild(heading);
      }
      root.appendChild(this.makeRow(control));
    }

    const buttons = document.createElement('div');
    Object.assign(buttons.style, { display: 'flex', gap: '6px', marginTop: '10px' });
    buttons.appendChild(this.makeButton('保存到文件', () => void this.saveToFile()));
    buttons.appendChild(this.makeButton('复制配置', () => this.copy(this.configSnippet())));
    root.appendChild(buttons);

    const status = document.createElement('div');
    status.textContent = '保存到 public/config/scene.json（主程序启动时自动加载）';
    Object.assign(status.style, { marginTop: '6px', opacity: '0.55', fontSize: '11px' });
    root.appendChild(status);
    this.status = status;

    const out = document.createElement('textarea');
    out.readOnly = true;
    out.spellcheck = false;
    Object.assign(out.style, {
      width: '100%',
      height: '86px',
      marginTop: '8px',
      background: '#0b1220',
      color: '#8fb6e8',
      border: '1px solid #24384f',
      borderRadius: '6px',
      font: '11px/1.45 ui-monospace, monospace',
    });
    out.value = this.configSnippet();
    this.out = out;
    root.appendChild(out);

    parent.appendChild(root);
  }

  private makeButton(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    Object.assign(button.style, {
      flex: '1',
      padding: '6px',
      borderRadius: '6px',
      border: '1px solid #35506e',
      background: '#1b2b3d',
      color: '#dce8f6',
      cursor: 'pointer',
      font: 'inherit',
    });
    button.addEventListener('click', onClick);
    return button;
  }

  /** A paste-ready Config.ts snippet of the current scene values. */
  private configSnippet(): string {
    const c = CONFIG.clouds;
    const b = CONFIG.balloons;
    const s = CONFIG.sun;
    const l = CONFIG.light;
    const m = CONFIG.mountains;
    const cl = CONFIG.course.cliffs;
    return [
      `clouds: { count: ${c.count}, minRadius: ${c.minRadius}, maxRadius: ${c.maxRadius}, minHeight: ${c.minHeight}, maxHeight: ${c.maxHeight}, minScale: ${c.minScale}, maxScale: ${c.maxScale} },`,
      `balloons: { count: ${b.count}, minRadius: ${b.minRadius}, maxRadius: ${b.maxRadius}, minHeight: ${b.minHeight}, maxHeight: ${b.maxHeight}, speed: ${b.speed}, minScale: ${b.minScale}, maxScale: ${b.maxScale} },`,
      `sun: { azimuth: ${s.azimuth}, elevation: ${s.elevation}, distance: ${s.distance}, size: ${s.size} },`,
      `light: { sunOffsetX: ${l.sunOffsetX}, sunOffsetY: ${l.sunOffsetY}, sunOffsetZ: ${l.sunOffsetZ} },`,
      `mountains: { count: ${m.count}, minRadius: ${m.minRadius}, maxRadius: ${m.maxRadius}, baseY: ${m.baseY}, farHeight: ${m.farHeight} },`,
      `course.cliffs: { scaleMin: ${cl.scaleMin}, scaleMax: ${cl.scaleMax} },`,
    ].join('\n');
  }

  private copy(text: string): void {
    try {
      void navigator.clipboard?.writeText(text);
    } catch {
      // clipboard may be unavailable; the box below still shows the text
    }
  }

  /** Persists the current tuning to public/config/scene.json (dev). */
  private async saveToFile(): Promise<void> {
    const ok = await this.handlers.onSave();
    if (ok) {
      this.setStatus('已保存到 public/config/scene.json ✓（下次启动自动加载）');
    } else {
      this.download(currentSceneOverrides());
      this.setStatus('无法写入文件，已下载 scene.json — 放进 public/config/ 即可');
    }
  }

  private setStatus(text: string): void {
    if (!this.status) return;
    this.status.textContent = text;
    this.status.style.opacity = '0.9';
    if (this.statusTimer !== null) window.clearTimeout(this.statusTimer);
    this.statusTimer = window.setTimeout(() => {
      if (!this.status) return;
      this.status.textContent = '保存到 public/config/scene.json（主程序启动时自动加载）';
      this.status.style.opacity = '0.55';
    }, 4000);
  }

  private download(data: unknown): void {
    const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'scene.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private makeRow(control: Control): HTMLDivElement {
    const row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '6px', margin: '3px 0' });

    const label = document.createElement('span');
    label.textContent = control.label;
    Object.assign(label.style, { width: '86px', opacity: '0.85', fontSize: '11px' });
    row.appendChild(label);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(control.min);
    slider.max = String(control.max);
    slider.step = String(control.step);
    slider.value = String(control.get());
    slider.style.flex = '1';
    row.appendChild(slider);

    const readout = document.createElement('span');
    readout.textContent = control.get().toFixed(control.step < 1 ? 2 : 0);
    Object.assign(readout.style, { width: '52px', textAlign: 'right' });
    row.appendChild(readout);

    const apply = () => {
      control.set(Number(slider.value));
      readout.textContent = control.get().toFixed(control.step < 1 ? 2 : 0);
      if (this.out) this.out.value = this.configSnippet();
    };
    slider.addEventListener('input', () => {
      apply();
      if (control.live) this.handlers[control.group]();
      else this.schedule(control.group);
    });
    slider.addEventListener('change', () => {
      apply();
      this.handlers[control.group]();
    });
    return row;
  }

  /** Coalesces heavy rebuilds so dragging a count slider stays responsive. */
  private schedule(group: Group): void {
    this.pending.add(group);
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.timer = null;
      for (const pending of this.pending) this.handlers[pending]();
      this.pending.clear();
    }, 120);
  }
}
