/** A single completed run, as reported by the Game on finish. */
export interface RunResultStats {
  score: number;
  timeMs: number;
  maxSpeedKmh: number;
  maxCombo: number;
  maxAirTime: number;
  tricks: number;
  gates: number;
  crashes: number;
}

/** Persistent, cross-run career totals. */
export interface PlayerStats {
  runs: number;
  crashes: number;
  tricks: number;
  gates: number;
  totalTimeMs: number;
  bestScore: number;
  bestTimeMs: number;
  bestSpeedKmh: number;
  bestCombo: number;
}

const STORAGE_KEY = 'SnowRush.stats';

const EMPTY: PlayerStats = {
  runs: 0,
  crashes: 0,
  tricks: 0,
  gates: 0,
  totalTimeMs: 0,
  bestScore: 0,
  bestTimeMs: 0,
  bestSpeedKmh: 0,
  bestCombo: 0,
};

function load(): PlayerStats {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<PlayerStats>) };
  } catch {
    return { ...EMPTY };
  }
}

let state: PlayerStats = load();
const listeners = new Set<(stats: PlayerStats) => void>();

export function getStats(): PlayerStats {
  return state;
}

export interface RecordOutcome {
  score: boolean;
  time: boolean;
  speed: boolean;
  combo: boolean;
}

/** Merges a finished run into the career totals. Returns which fields set records. */
export function recordRun(run: RunResultStats): RecordOutcome {
  const outcome: RecordOutcome = {
    score: run.score > state.bestScore && run.score > 0,
    // Fastest time only counts on runs that avoided a crash-free requirement?
    // No: any finished run is a valid time.
    time: run.timeMs > 0 && (state.bestTimeMs === 0 || run.timeMs < state.bestTimeMs),
    speed: run.maxSpeedKmh > state.bestSpeedKmh,
    combo: run.maxCombo > state.bestCombo,
  };

  state = {
    runs: state.runs + 1,
    crashes: state.crashes + run.crashes,
    tricks: state.tricks + run.tricks,
    gates: state.gates + run.gates,
    totalTimeMs: state.totalTimeMs + run.timeMs,
    bestScore: Math.max(state.bestScore, run.score),
    bestTimeMs: outcome.time ? run.timeMs : state.bestTimeMs,
    bestSpeedKmh: Math.max(state.bestSpeedKmh, run.maxSpeedKmh),
    bestCombo: Math.max(state.bestCombo, run.maxCombo),
  };

  persist();
  for (const listener of listeners) listener(state);
  return outcome;
}

export function resetStats(): void {
  state = { ...EMPTY };
  persist();
  for (const listener of listeners) listener(state);
}

function persist(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage can be unavailable (private mode); ignore.
  }
}

export function onStatsChange(listener: (stats: PlayerStats) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Formats a duration in milliseconds as mm:ss. */
export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
