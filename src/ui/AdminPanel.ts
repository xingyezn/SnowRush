import type { CharacterOption } from '../world/ModelLibrary';

/** Rider placement on the board, tunable from the admin panel. */
export interface RiderTuning {
  /** Facing correction in radians. */
  yaw: number;
  /** Board-local offset in metres (z = along the board, -z = nose/forward). */
  x: number;
  y: number;
  z: number;
}

export interface AdminEntry {
  id: string;
  name: string;
  tuning: RiderTuning;
}

export interface AdminHandlers {
  onSelect(id: string, tuning: RiderTuning): void;
  onTune(tuning: RiderTuning): void;
  /** Persists scene + character tuning (writes scene.json or downloads it). */
  onSave(): Promise<boolean>;
}

const TUNING_KEYS = ['yaw', 'x', 'y', 'z'] as const;
type TuningKey = (typeof TUNING_KEYS)[number];

const RANGES: Record<TuningKey, { min: number; max: number; step: number; format: (v: number) => string }> = {
  yaw: { min: -180, max: 180, step: 1, format: (v) => `${v.toFixed(0)}°` },
  x: { min: -1.5, max: 1.5, step: 0.005, format: (v) => `${v.toFixed(3)} m` },
  y: { min: -1.5, max: 1.5, step: 0.005, format: (v) => `${v.toFixed(3)} m` },
  z: { min: -1.5, max: 1.5, step: 0.005, format: (v) => `${v.toFixed(3)} m` },
};

/**
 * Live tuning panel for rider-on-board placement, opened with `?admin=1`.
 * It drives the real game rider/board, so what you see is what ships; the
 * "Copy" buttons emit the values to paste into ModelLibrary.CHARACTERS.
 */
export class AdminPanel {
  private readonly root: HTMLDivElement;
  private readonly select: HTMLSelectElement;
  private readonly sliders = {} as Record<TuningKey, HTMLInputElement>;
  private readonly readouts = {} as Record<TuningKey, HTMLSpanElement>;
  private readonly entries: AdminEntry[];
  private readonly handlers: AdminHandlers;
  private currentId: string;

  constructor(
    parent: HTMLElement,
    entries: AdminEntry[],
    handlers: AdminHandlers,
    selectedId: string,
  ) {
    this.entries = entries;
    this.handlers = handlers;
    this.currentId = entries.some((entry) => entry.id === selectedId)
      ? selectedId
      : entries[0]?.id ?? '';

    this.root = document.createElement('div');
    this.root.id = 'snowrush-admin';
    Object.assign(this.root.style, {
      position: 'fixed',
      top: '12px',
      left: '12px',
      zIndex: '9999',
      width: '300px',
      padding: '12px',
      borderRadius: '10px',
      background: 'rgba(15,23,33,0.9)',
      color: '#e8f0fa',
      font: '12px/1.5 ui-monospace, Consolas, monospace',
      boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
      userSelect: 'none',
    } satisfies Partial<CSSStyleDeclaration>);

    const header = document.createElement('div');
    Object.assign(header.style, { display: 'flex', alignItems: 'center', marginBottom: '6px' });
    const title = document.createElement('div');
    title.textContent = '滑雪者位置调节';
    Object.assign(title.style, { fontWeight: '700', flex: '1' });
    header.appendChild(title);
    header.appendChild(this.makeCloseButton());
    this.root.appendChild(header);

    const hint = document.createElement('div');
    hint.textContent = 'z 负=板头(前)，y 上，x 左右';
    Object.assign(hint.style, { opacity: '0.65', marginBottom: '8px' });
    this.root.appendChild(hint);

    this.select = document.createElement('select');
    Object.assign(this.select.style, { width: '100%', marginBottom: '8px', padding: '4px' });
    for (const entry of entries) {
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = entry.name;
      this.select.appendChild(option);
    }
    this.select.addEventListener('change', () => this.selectCharacter(this.select.value));
    this.root.appendChild(this.select);

    for (const key of TUNING_KEYS) {
      const row = document.createElement('div');
      Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' });

      const label = document.createElement('span');
      label.textContent = key;
      Object.assign(label.style, { width: '30px', opacity: '0.8' });
      row.appendChild(label);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = String(RANGES[key].min);
      slider.max = String(RANGES[key].max);
      slider.step = String(RANGES[key].step);
      slider.style.flex = '1';
      row.appendChild(slider);

      const readout = document.createElement('span');
      Object.assign(readout.style, { width: '64px', textAlign: 'right' });
      row.appendChild(readout);

      slider.addEventListener('input', () => this.onSlide(key, Number(slider.value)));
      this.sliders[key] = slider;
      this.readouts[key] = readout;
      this.root.appendChild(row);
    }

    const buttons = document.createElement('div');
    Object.assign(buttons.style, { display: 'flex', gap: '6px', marginTop: '10px' });
    buttons.appendChild(this.makeButton('保存到文件', () => void this.saveToFile()));
    buttons.appendChild(this.makeButton('复制', () => this.copy(this.currentSnippet())));
    buttons.appendChild(this.makeButton('复制全部', () => this.copy(this.allSnippets())));
    buttons.appendChild(this.makeButton('重置', () => this.loadEntry(this.currentId, true)));
    this.root.appendChild(buttons);

    const status = document.createElement('div');
    status.textContent = '保存后写入 public/config/scene.json（含场景与滑雪者位置）';
    Object.assign(status.style, { marginTop: '6px', opacity: '0.55', fontSize: '11px' });
    this.root.appendChild(status);
    this.status = status;

    const out = document.createElement('textarea');
    out.readOnly = true;
    out.spellcheck = false;
    Object.assign(out.style, {
      width: '100%',
      height: '58px',
      marginTop: '8px',
      background: '#0b1220',
      color: '#8fb6e8',
      border: '1px solid #24384f',
      borderRadius: '6px',
      font: '11px/1.4 ui-monospace, monospace',
    });
    out.value = '';
    this.root.appendChild(out);
    this.output = out;

    parent.appendChild(this.root);
    this.select.value = this.currentId;
    this.loadEntry(this.currentId, false);
  }

  private output: HTMLTextAreaElement;
  private status: HTMLDivElement | null = null;
  private statusTimer: number | null = null;

  private makeButton(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    Object.assign(button.style, {
      flex: '1',
      padding: '5px 6px',
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

  private makeCloseButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '×';
    Object.assign(button.style, {
      border: 'none',
      background: 'transparent',
      color: '#dce8f6',
      fontSize: '16px',
      lineHeight: '1',
      padding: '0 4px',
      cursor: 'pointer',
    });
    button.addEventListener('click', () => this.setVisible(false));
    return button;
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? '' : 'none';
  }

  private entry(id: string): AdminEntry | undefined {
    return this.entries.find((entry) => entry.id === id);
  }

  private currentTuning(): RiderTuning {
    return {
      yaw: (Number(this.sliders.yaw.value) * Math.PI) / 180,
      x: Number(this.sliders.x.value),
      y: Number(this.sliders.y.value),
      z: Number(this.sliders.z.value),
    };
  }

  private selectCharacter(id: string): void {
    this.currentId = id;
    this.loadEntry(id, true);
  }

  /** Loads a character's tuning into the sliders; optionally re-applies it. */
  private loadEntry(id: string, notify: boolean): void {
    const entry = this.entry(id);
    if (!entry) return;
    // Normalise yaw into (-180, 180] so it always fits the slider range.
    const yawDeg = (entry.tuning.yaw * 180) / Math.PI;
    const values: Record<TuningKey, number> = {
      yaw: ((((yawDeg + 180) % 360) + 360) % 360) - 180,
      x: entry.tuning.x,
      y: entry.tuning.y,
      z: entry.tuning.z,
    };
    for (const key of TUNING_KEYS) {
      this.sliders[key].value = String(values[key]);
      this.readouts[key].textContent = RANGES[key].format(values[key]);
    }
    if (notify) {
      const tuning = this.currentTuning();
      this.handlers.onSelect(id, tuning);
      this.handlers.onTune(tuning);
    }
    this.output.value = this.currentSnippet();
  }

  private onSlide(key: TuningKey, value: number): void {
    this.readouts[key].textContent = RANGES[key].format(value);
    const tuning = this.currentTuning();
    this.handlers.onTune(tuning);
    this.output.value = this.currentSnippet();
  }

  private snippet(entry: AdminEntry): string {
    const offset = `{ x: ${entry.tuning.x.toFixed(3)}, y: ${entry.tuning.y.toFixed(3)}, z: ${entry.tuning.z.toFixed(3)} }`;
    return `{ id: '${entry.id}', yaw: ${entry.tuning.yaw.toFixed(4)}, boardOffset: ${offset} },`;
  }

  private currentSnippet(): string {
    return this.snippet({ id: this.currentId, name: '', tuning: this.currentTuning() });
  }

  private allSnippets(): string {
    this.entries.forEach((entry) => {
      if (entry.id === this.currentId) entry.tuning = this.currentTuning();
    });
    return this.entries.map((entry) => this.snippet(entry)).join('\n');
  }

  private copy(text: string): void {
    try {
      void navigator.clipboard?.writeText(text);
    } catch {
      // clipboard may be unavailable (insecure context); the output box still shows the text
    }
    this.output.value = text;
    this.output.select();
  }

  private async saveToFile(): Promise<void> {
    const ok = await this.handlers.onSave();
    this.setStatus(
      ok ? '已保存到 public/config/scene.json ✓' : '无法写入文件（请用场景面板的下载回退）',
    );
  }

  private setStatus(text: string): void {
    if (!this.status) return;
    this.status.textContent = text;
    this.status.style.opacity = '0.9';
    if (this.statusTimer !== null) window.clearTimeout(this.statusTimer);
    this.statusTimer = window.setTimeout(() => {
      if (!this.status) return;
      this.status.textContent = '保存后写入 public/config/scene.json（含场景与滑雪者位置）';
      this.status.style.opacity = '0.55';
    }, 4000);
  }
}

/** Builds admin entries from the loaded character options. */
export function toAdminEntries(characters: CharacterOption[]): AdminEntry[] {
  return characters.map((character) => ({
    id: character.id,
    name: character.name,
    tuning: {
      yaw: character.yaw,
      x: character.boardOffset.x,
      y: character.boardOffset.y,
      z: character.boardOffset.z,
    },
  }));
}
