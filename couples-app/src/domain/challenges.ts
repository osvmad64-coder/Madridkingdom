import { gameConfig } from '../config/game';
import type {
  Challenge,
  ChallengeAssignment,
  DayKey,
  MonthKey,
} from '../models/types';
import { hashString, seededRng, shuffle } from './random';
import { daysInMonth, monthDays } from './time';

/**
 * Sistema de retos.
 * Cada mes se genera (una sola vez) un calendario de retos: algunos días
 * aleatorios, nunca más del porcentaje máximo configurado.
 */

export type MonthSchedule = Record<DayKey, ChallengeAssignment>;

export function availableChallenges(all: Challenge[], enabledPacks: string[]): Challenge[] {
  return all.filter((c) => enabledPacks.includes(c.pack));
}

/** Cuántos días del mes tendrán reto (respeta mínimo y máximo configurados). */
export function challengeDayCount(month: MonthKey, rng: () => number): number {
  const { maxDaysRatio, minDaysRatio } = gameConfig.challenges;
  const n = daysInMonth(month);
  const max = Math.floor(n * maxDaysRatio);
  const min = Math.min(max, Math.ceil(n * minDaysRatio));
  return min + Math.floor(rng() * (max - min + 1));
}

export function generateMonthSchedule(
  month: MonthKey,
  pool: Challenge[],
  seed: number,
): MonthSchedule {
  const rng = seededRng(hashString(`${month}:${seed}`));
  const days = monthDays(month);
  const schedule: MonthSchedule = {};
  const target = challengeDayCount(month, rng);
  if (!pool.length || target === 0) return schedule;

  // 1) Fechas especiales fijas (ej. 14 de febrero).
  const mm = month.slice(5, 7);
  for (const c of pool) {
    if (c.fixedDate && c.fixedDate.startsWith(mm)) {
      const day = `${month}-${c.fixedDate.slice(3, 5)}`;
      if (days.includes(day)) schedule[day] = { day, challengeId: c.id, status: 'pending' };
    }
  }

  // 2) Días aleatorios con retos no fijos, sin repetir mientras haya opciones.
  const regular = pool.filter((c) => !c.fixedDate);
  if (!regular.length) return schedule;
  const freeDays = shuffle(days.filter((d) => !schedule[d]), rng);
  const needed = Math.max(0, target - Object.keys(schedule).length);
  let bag: Challenge[] = [];
  for (const day of freeDays.slice(0, needed)) {
    if (!bag.length) bag = shuffle(regular, rng);
    const c = bag.pop()!;
    schedule[day] = { day, challengeId: c.id, status: 'pending' };
  }
  return schedule;
}

export function canCompleteOn(day: DayKey, today: DayKey): boolean {
  if (day > today) return false;
  return day === today || gameConfig.challenges.allowPastCompletion;
}

export function allAssignments(
  schedule: Record<MonthKey, MonthSchedule>,
): ChallengeAssignment[] {
  return Object.values(schedule).flatMap((m) => Object.values(m));
}

export function completedAssignments(
  schedule: Record<MonthKey, MonthSchedule>,
  from?: DayKey,
  to?: DayKey,
): ChallengeAssignment[] {
  return allAssignments(schedule).filter(
    (a) =>
      a.status === 'completed' && (!from || a.day >= from) && (!to || a.day <= to),
  );
}

export const CHALLENGE_TYPE_LABEL: Record<Challenge['type'], string> = {
  bonus: 'Bonus de puntos',
  romantic: 'Reto romántico',
  experience: 'Experiencia',
  surprise: 'Sorpresa',
  special: 'Fecha especial',
};

export const DIFFICULTY_LABEL: Record<Challenge['difficulty'], string> = {
  easy: 'Fácil',
  medium: 'Medio',
  hard: 'Atrevido',
};
