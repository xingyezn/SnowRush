import type { RunResultStats } from './Stats';

export type DailyKind = 'score' | 'gates' | 'tricks' | 'speed' | 'time' | 'air';

export interface DailyObjective {
  id: string;
  kind: DailyKind;
  target: number;
}

const OBJECTIVES: DailyObjective[] = [
  { id: 'score', kind: 'score', target: 5000 },
  { id: 'gates', kind: 'gates', target: 8 },
  { id: 'tricks', kind: 'tricks', target: 6 },
  { id: 'speed', kind: 'speed', target: 120 },
  { id: 'time', kind: 'time', target: 90 },
  { id: 'air', kind: 'air', target: 2.5 },
];

interface DailyState {
  date: string;
  id: string;
  completed: boolean;
}

const STORAGE_KEY = 'SnowRush.daily';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function dateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function objectiveFor(date: string): DailyObjective {
  return OBJECTIVES[hash(date) % OBJECTIVES.length];
}

function load(): DailyState {
  const date = dateKey();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyState;
      if (parsed.date === date && OBJECTIVES.some((o) => o.id === parsed.id)) return parsed;
    }
  } catch {
    // ignore
  }
  return { date, id: objectiveFor(date).id, completed: false };
}

let state: DailyState = load();
const listeners = new Set<(state: DailyState) => void>();

function persist(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function getDailyObjective(): DailyObjective {
  return OBJECTIVES.find((o) => o.id === state.id) ?? OBJECTIVES[0];
}

export function isDailyComplete(): boolean {
  return state.completed;
}

/** Whether this run satisfies today's objective; persists a completion. */
export function evaluateDaily(run: RunResultStats): boolean {
  if (state.completed) return false;
  const objective = getDailyObjective();
  let met = false;
  switch (objective.kind) {
    case 'score':
      met = run.score >= objective.target;
      break;
    case 'gates':
      met = run.gates >= objective.target;
      break;
    case 'tricks':
      met = run.tricks >= objective.target;
      break;
    case 'speed':
      met = run.maxSpeedKmh >= objective.target;
      break;
    case 'time':
      met = run.timeMs > 0 && run.timeMs / 1000 <= objective.target;
      break;
    case 'air':
      met = run.maxAirTime >= objective.target;
      break;
  }
  if (!met) return false;

  state = { ...state, completed: true };
  persist();
  for (const listener of listeners) listener(state);
  return true;
}

export function onDailyChange(listener: (state: DailyState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
