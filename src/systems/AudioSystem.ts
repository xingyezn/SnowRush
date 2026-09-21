import { CONFIG } from '../core/Config';

/**
 * Procedural audio built with the Web Audio API (no external sound assets).
 *
 * Wind and snow-slide are looping filtered-noise beds driven by speed; jump,
 * landing, crash, checkpoint and combo are short synthesised one-shots.
 * The context starts suspended until the first user gesture unlocks it.
 */
export class AudioSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private slideGain: GainNode | null = null;
  private slideFilter: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled = true;

  constructor() {
    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  /** Creates / resumes the audio context. Safe to call repeatedly. */
  unlock(): void {
    if (!this.context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
      this.build();
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(enabled ? CONFIG.audio.masterVolume : 0, this.context.currentTime, 0.05);
    }
  }

  update(speed: number, grounded: boolean): void {
    if (!this.context || !this.windGain || !this.slideGain || !this.windFilter || !this.slideFilter) return;
    const a = CONFIG.audio;
    const t = Math.min(Math.max((speed - a.minSpeed) / (a.maxSpeed - a.minSpeed), 0), 1);
    const now = this.context.currentTime;
    this.windGain.gain.setTargetAtTime(t * a.windMaxGain, now, 0.12);
    this.windFilter.frequency.setTargetAtTime(420 + t * 900, now, 0.12);
    this.slideGain.gain.setTargetAtTime(grounded ? t * a.slideMaxGain : 0, now, 0.08);
    this.slideFilter.frequency.setTargetAtTime(1200 + t * 1400, now, 0.1);
  }

  playJump(): void {
    this.tone('triangle', 320, 760, 0.24, 0.22);
  }

  playLanding(strength: number): void {
    this.noiseBurst(0.18 + strength * 0.2, 0.22 + strength * 0.25, 900 + strength * 700);
  }

  playCrash(): void {
    this.noiseBurst(0.5, 0.4, 500);
    this.tone('sawtooth', 180, 60, 0.4, 0.25);
  }

  playCheckpoint(): void {
    this.tone('sine', 660, 660, 0.12, 0.2);
    this.tone('sine', 990, 990, 0.16, 0.2, 0.1);
  }

  playCombo(level: number): void {
    const base = 440 * Math.pow(1.12, Math.max(0, level - 1));
    this.tone('sine', base, base * 1.5, 0.18, 0.18);
  }

  private build(): void {
    const ctx = this.context;
    if (!ctx) return;

    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? CONFIG.audio.masterVolume : 0;
    this.master.connect(ctx.destination);

    this.noiseBuffer = this.createNoiseBuffer(ctx);

    // Wind: low-passed noise.
    this.windSourceSetup(ctx);

    // Snow slide: band-passed noise.
    const slideSource = ctx.createBufferSource();
    slideSource.buffer = this.noiseBuffer;
    slideSource.loop = true;
    this.slideFilter = ctx.createBiquadFilter();
    this.slideFilter.type = 'bandpass';
    this.slideFilter.frequency.value = 1400;
    this.slideFilter.Q.value = 0.7;
    this.slideGain = ctx.createGain();
    this.slideGain.gain.value = 0;
    slideSource.connect(this.slideFilter).connect(this.slideGain).connect(this.master);
    slideSource.start();
  }

  private windSourceSetup(ctx: AudioContext): void {
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 500;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    source.connect(this.windFilter).connect(this.windGain).connect(this.master as GainNode);
    source.start();
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private tone(
    type: OscillatorType,
    from: number,
    to: number,
    duration: number,
    peak: number,
    delay = 0,
  ): void {
    const ctx = this.context;
    if (!ctx || !this.master || !this.enabled) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  private noiseBurst(duration: number, peak: number, cutoff: number): void {
    const ctx = this.context;
    if (!ctx || !this.master || !this.noiseBuffer || !this.enabled) return;
    const start = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(cutoff * 0.3, 80), start + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.05);
  }
}
