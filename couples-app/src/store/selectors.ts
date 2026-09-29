import { ACHIEVEMENTS } from '../content/achievements';
import type { Metrics } from '../domain/achievements';
import { summarizeStreaks } from '../domain/streaks';
import { totalPoints } from '../domain/points';
import { todayKey } from '../domain/time';
import { completedAssignments } from '../features/challenges/service';
import { doneLogs } from '../features/dates/service';
import type { AppState, DayKey, HeartEntry } from '../models/types';

/**
 * Selectores: datos derivados del estado. Se memorizan por referencia
 * de estado para que la UI pueda llamarlos libremente.
 */

function memo<R>(fn: (s: AppState) => R): (s: AppState) => R {
  const cache = new WeakMap<AppState, R>();
  return (s) => {
    if (!cache.has(s)) cache.set(s, fn(s));
    return cache.get(s)!;
  };
}

export const selectHeartsByDay = memo((s) => {
  const m = new Map<DayKey, HeartEntry[]>();
  for (const h of s.hearts) {
    const list = m.get(h.day) ?? [];
    list.push(h);
    m.set(h.day, list);
  }
  return m;
});

export const selectHeartDays = memo((s) => new Set(s.hearts.map((h) => h.day)));

export const selectTotalPoints = memo((s) => totalPoints(s.ledger));

/** Nota: depende de "hoy"; se recalcula si cambia el día. */
export function selectStreaks(s: AppState, today = todayKey()) {
  return streakMemo(s)(today);
}
const streakMemo = memo((s) => {
  const cache = new Map<string, ReturnType<typeof summarizeStreaks>>();
  return (today: DayKey) => {
    if (!cache.has(today)) cache.set(today, summarizeStreaks(selectHeartDays(s), today));
    return cache.get(today)!;
  };
});

export function selectAssignment(s: AppState, day: DayKey) {
  return s.challengeSchedule[day.slice(0, 7)]?.[day];
}

export const selectMetrics = memo((s): Metrics => ({
  heartDays: selectHeartDays(s).size,
  bestStreak: summarizeStreaks(selectHeartDays(s), todayKey()).best,
  totalPoints: selectTotalPoints(s),
  challengesCompleted: completedAssignments(s.challengeSchedule).length,
  datesDone: doneLogs(s.dates.logs).length,
  favorites: s.dates.favorites.length,
}));

export const selectRecentActivity = memo((s) =>
  [...s.ledger].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6),
);

/** La biblioteca de citas es la del estado (creada por la pareja). */
export const selectDateLibrary = (s: AppState) => s.dateIdeas;
export const selectAchievements = () => ACHIEVEMENTS;
