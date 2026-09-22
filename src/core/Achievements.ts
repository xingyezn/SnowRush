import type { PlayerStats, RunResultStats } from './Stats';

export interface AchievementDef {
  id: string;
  condition: (run: RunResultStats, stats: PlayerStats) => boolean;
}

/**
 * Career achievements. `nameKey` / `descKey` are looked up in the i18n
 * dictionary (see src/ui/I18n.ts). Unlocked ids are persisted locally.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-run', condition: (_run, stats) => stats.runs >= 1 },
  { id: 'clean-run', condition: (run) => run.crashes === 0 },
  { id: 'combo-3', condition: (run) => run.maxCombo >= 3 },
  { id: 'speed-100', condition: (_run, stats) => stats.bestSpeedKmh >= 100 },
  { id: 'score-5000', condition: (_run, stats) => stats.bestScore >= 5000 },
  { id: 'score-10000', condition: (_run, stats) => stats.bestScore >= 10000 },
  { id: 'trick-8', condition: (run) => run.tricks >= 8 },
  { id: 'all-gates', condition: (run) => run.gates >= 8 },
  { id: 'combo-5', condition: (run) => run.maxCombo >= 5 },
  { id: 'speed-130', condition: (_run, stats) => stats.bestSpeedKmh >= 130 },
  { id: 'air-2s', condition: (run) => run.maxAirTime >= 2 },
];

const STORAGE_KEY = 'SnowRush.achievements';

function load(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

let unlocked = load();
const listeners = new Set<(ids: Set<string>) => void>();

export function isUnlocked(id: string): boolean {
  return unlocked.has(id);
}

export function unlockedIds(): Set<string> {
  return unlocked;
}

/** Returns the ids unlocked by this run (already-unlocked ones are excluded). */
export function evaluateAchievements(run: RunResultStats, stats: PlayerStats): string[] {
  const newly: string[] = [];
  for (const def of ACHIEVEMENTS) {
    if (unlocked.has(def.id)) continue;
    if (def.condition(run, stats)) newly.push(def.id);
  }
  if (newly.length > 0) {
    for (const id of newly) unlocked.add(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked]));
    } catch {
      // ignore
    }
    for (const listener of listeners) listener(unlocked);
  }
  return newly;
}

export function resetAchievements(): void {
  unlocked = new Set();
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  for (const listener of listeners) listener(unlocked);
}

export function onAchievementsChange(listener: (ids: Set<string>) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
