import { gameConfig } from '../config/game';
import type { DayKey } from '../models/types';
import { diffDays } from './time';

/** Lógica de rachas. Funciones puras sobre una lista de días con ❤️. */

export interface StreakRun {
  start: DayKey;
  end: DayKey;
  /** Días con registro dentro de la racha. */
  length: number;
}

export interface StreakSummary {
  current: number;
  /** Récord histórico. */
  best: number;
  /** ¿La racha actual incluye hoy? (si no, sigue viva hasta que pase el margen). */
  activeToday: boolean;
  runs: StreakRun[];
}

const gap = () => gameConfig.streak.allowedGapDays;

/** Agrupa días únicos ordenados en rachas continuas. */
export function computeRuns(days: Iterable<DayKey>): StreakRun[] {
  const sorted = [...new Set(days)].sort();
  const runs: StreakRun[] = [];
  for (const day of sorted) {
    const last = runs[runs.length - 1];
    if (last && diffDays(last.end, day) <= 1 + gap()) {
      last.end = day;
      last.length += 1;
    } else {
      runs.push({ start: day, end: day, length: 1 });
    }
  }
  return runs;
}

export function summarizeStreaks(days: Iterable<DayKey>, today: DayKey): StreakSummary {
  const runs = computeRuns(days);
  const best = runs.reduce((m, r) => Math.max(m, r.length), 0);
  const last = runs[runs.length - 1];
  let current = 0;
  let activeToday = false;
  if (last) {
    const since = diffDays(last.end, today);
    // Sigue viva si el último registro fue hoy o dentro del margen permitido.
    if (since >= 0 && since <= 1 + gap()) current = last.length;
    activeToday = since === 0;
  }
  return { current, best, activeToday, runs };
}

/** Longitud de la racha que contiene `day` (0 si ese día no tiene registro). */
export function runLengthAt(days: Iterable<DayKey>, day: DayKey): number {
  return computeRuns(days).find((r) => r.start <= day && day <= r.end)?.length ?? 0;
}

/** Milestones cruzados al pasar de una longitud a otra. */
export function crossedMilestones(before: number, after: number) {
  return gameConfig.streak.milestones.filter((m) => before < m.days && m.days <= after);
}

/** Próximo milestone desde la racha actual (o null si ya pasó todos). */
export function nextMilestone(current: number) {
  return gameConfig.streak.milestones.find((m) => m.days > current) ?? null;
}

/** Mejor racha dentro de un rango de días [from, to]. */
export function bestRunInRange(days: Iterable<DayKey>, from: DayKey, to: DayKey): number {
  const inRange = [...days].filter((d) => d >= from && d <= to);
  return computeRuns(inRange).reduce((m, r) => Math.max(m, r.length), 0);
}

/** Días del último milestone alcanzado (0 si ninguno), para barras de progreso. */
export function previousMilestoneDays(current: number): number {
  return gameConfig.streak.milestones.filter((m) => m.days <= current).pop()?.days ?? 0;
}
