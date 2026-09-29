import type { ChallengeAssignment, DayKey, PointsEvent } from '../models/types';
import { pointsByDay } from './points';
import { bestRunInRange } from './streaks';
import {
  addDays,
  addMonths,
  daysInMonth,
  monthDays,
  MONTHS_SHORT,
  startOfWeek,
  WEEKDAYS_SHORT,
} from './time';

/** Estadísticas por periodo y comparaciones históricas (contra nosotros mismos). */

export type Period = 'week' | 'month' | 'year';

export interface Range {
  from: DayKey;
  to: DayKey;
}

export interface Bucket {
  label: string;
  points: number;
  hearts: number;
  isCurrent: boolean;
}

export interface PeriodStats {
  range: Range;
  heartDays: number;
  points: number;
  challenges: number;
  bestStreak: number;
  buckets: Bucket[];
}

export function periodRange(period: Period, today: DayKey, offset = 0): Range {
  if (period === 'week') {
    const from = addDays(startOfWeek(today), offset * 7);
    return { from, to: addDays(from, 6) };
  }
  if (period === 'month') {
    const m = addMonths(today.slice(0, 7), offset);
    return { from: `${m}-01`, to: `${m}-${String(daysInMonth(m)).padStart(2, '0')}` };
  }
  const y = Number(today.slice(0, 4)) + offset;
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

interface Inputs {
  heartDays: Set<DayKey>;
  ledger: PointsEvent[];
  assignments: ChallengeAssignment[];
}

export function computePeriodStats(period: Period, today: DayKey, input: Inputs, offset = 0): PeriodStats {
  const range = periodRange(period, today, offset);
  const byDay = pointsByDay(input.ledger);
  const inRange = (d: DayKey) => d >= range.from && d <= range.to;

  let buckets: Bucket[];
  if (period === 'year') {
    const y = range.from.slice(0, 4);
    buckets = MONTHS_SHORT.map((label, i) => {
      const days = monthDays(`${y}-${String(i + 1).padStart(2, '0')}`);
      return {
        label: label[0].toUpperCase(),
        points: days.reduce((s, d) => s + (byDay.get(d) ?? 0), 0),
        hearts: days.filter((d) => input.heartDays.has(d)).length,
        isCurrent: today.slice(0, 7) === days[0].slice(0, 7),
      };
    });
  } else {
    const days = period === 'week'
      ? Array.from({ length: 7 }, (_, i) => addDays(range.from, i))
      : monthDays(range.from.slice(0, 7));
    buckets = days.map((d, i) => ({
      label: period === 'week' ? WEEKDAYS_SHORT[i] : String(i + 1),
      points: byDay.get(d) ?? 0,
      hearts: input.heartDays.has(d) ? 1 : 0,
      isCurrent: d === today,
    }));
  }

  return {
    range,
    heartDays: [...input.heartDays].filter(inRange).length,
    points: input.ledger.reduce((s, e) => (inRange(e.day) ? s + e.amount : s), 0),
    challenges: input.assignments.filter((a) => a.status === 'completed' && inRange(a.day)).length,
    bestStreak: bestRunInRange(input.heartDays, range.from, range.to),
    buckets,
  };
}

export interface Comparison {
  current: number;
  previous: number;
  /** Diferencia relativa (null si no hay base para comparar). */
  delta: number | null;
}

export function compare(current: number, previous: number): Comparison {
  return { current, previous, delta: previous === 0 ? null : (current - previous) / previous };
}

/** Mejor semana o mes histórico por días con ❤️ (desempata por puntos). */
export function bestPeriod(period: 'week' | 'month', input: Inputs): { range: Range; heartDays: number; points: number } | null {
  if (!input.heartDays.size) return null;
  const byDay = pointsByDay(input.ledger);
  const groups = new Map<string, { range: Range; heartDays: number; points: number }>();
  const keyOf = (d: DayKey) => (period === 'week' ? startOfWeek(d) : d.slice(0, 7));
  const allDays = new Set<DayKey>([...input.heartDays, ...byDay.keys()]);
  for (const d of allDays) {
    const k = keyOf(d);
    if (!groups.has(k)) groups.set(k, { range: periodRange(period, d), heartDays: 0, points: 0 });
    const g = groups.get(k)!;
    if (input.heartDays.has(d)) g.heartDays += 1;
    g.points += byDay.get(d) ?? 0;
  }
  return [...groups.values()].sort((a, b) => b.heartDays - a.heartDays || b.points - a.points)[0] ?? null;
}
