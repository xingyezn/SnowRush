import { CONFIG } from '../core/Config';

export type MusicMode = 'none' | 'menu' | 'game';

/** Seconds per 8th-note step. */
const STEP = 0.28;

const midiToFreq = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

/**
 * Tiny procedural background music: a calm pad for menus and a light driving
 * arpeggio for gameplay. Both patterns are scheduled from one clock and routed
 * to two gains that crossfade on setMode(). No external audio assets.
 */
export class Music {
  private readonly ctx: AudioContext;
  private readonly menuGain: GainNode;
  private readonly gameGain: GainNode;
  private readonly noise: AudioBuffer;
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private mode: MusicMode = 'none';

  constructor(ctx: AudioContext, out: AudioNode) {
    this.ctx = ctx;
    this.menuGain = ctx.createGain();
    this.menuGain.gain.value = 0;
    this.menuGain.connect(out);
    this.gameGain = ctx.createGain();
    this.gameGain.gain.value = 0;
    this.gameGain.connect(out);

    const length = Math.floor(ctx.sampleRate * 0.2);
    this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }

  start(): void {
    if (this.timer !== null) return;
    this.nextTime = this.ctx.currentTime + 0.15;
    this.step = 0;
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  setMode(mode: MusicMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    const now = this.ctx.currentTime;
    const fade = CONFIG.audio.musicFade / 3;
    this.menuGain.gain.setTargetAtTime(mode === 'menu' ? 1 : 0, now, fade);
    this.gameGain.gain.setTargetAtTime(mode === 'game' ? 1 : 0, now, fade);
  }

  private tick(): void {
    const ahead = this.ctx.currentTime + 0.2;
    while (this.nextTime < ahead) {
      if (this.mode !== 'none') this.schedule(this.step, this.nextTime);
      this.step += 1;
      this.nextTime += STEP;
    }
  }

  private schedule(step: number, time: number): void {
    if (this.mode === 'menu') this.scheduleMenu(step, time);
    else this.scheduleGame(step, time);
  }

  private scheduleMenu(step: number, time: number): void {
    const chords = [
      [57, 60, 64], // Am
      [53, 57, 60], // F
      [60, 64, 67], // C
      [55, 59, 62], // G
    ];
    const bar = Math.floor(step / 8) % chords.length;
    if (step % 8 === 0) {
      for (const note of chords[bar]) {
        this.pad(this.menuGain, time, midiToFreq(note), STEP * 7.5, 0.05);
      }
    }
    // Sparse melody notes.
    if (step % 2 === 1) {
      const scale = [0, 3, 5, 7, 10, 12, 15];
      const idx = (step * 5 + bar * 3) % scale.length;
      this.blip(this.menuGain, time, midiToFreq(chords[bar][0] + 12 + scale[idx]), 0.3, 'sine', 0.035);
    }
  }

  private scheduleGame(step: number, time: number): void {
    const roots = [45, 45, 48, 50]; // A A C D
    const bar = Math.floor(step / 8) % roots.length;
    const root = roots[bar];
    if (step % 4 === 0) {
      this.blip(this.gameGain, time, midiToFreq(root), 0.22, 'triangle', 0.09);
    }
    // Arpeggio on every step, one octave up.
    const arp = [0, 4, 7, 12];
    const note = root + 12 + arp[step % arp.length];
    this.blip(this.gameGain, time, midiToFreq(note), 0.16, 'sawtooth', 0.03);
    // Soft hat on off-beats.
    if (step % 2 === 1) this.hat(this.gameGain, time, 0.02);
  }

  private pad(out: GainNode, time: number, freq: number, dur: number, peak: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + dur * 0.35);
    gain.gain.linearRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain).connect(out);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  private blip(
    out: GainNode,
    time: number,
    freq: number,
    dur: number,
    type: OscillatorType,
    peak: number,
  ): void {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain).connect(out);
    osc.start(time);
    osc.stop(time + dur + 0.03);
  }

  private hat(out: GainNode, time: number, peak: number): void {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(peak, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    source.connect(filter).connect(gain).connect(out);
    source.start(time);
    source.stop(time + 0.08);
  }
}
