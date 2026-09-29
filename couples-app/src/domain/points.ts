import { gameConfig } from '../config/game';
import type { DayKey, PointsEvent } from '../models/types';

/** Lógica de puntos: cálculo de recompensas y lectura del libro de puntos. */

export function streakMultiplier(streak: number): number {
  const tiers = [...gameConfig.points.streakMultipliers].sort((a, b) => b.minStreak - a.minStreak);
  return tiers.find((t) => streak >= t.minStreak)?.multiplier ?? 1;
}

/** Puntos por un registro ❤️ dada la racha resultante. */
export function heartReward(streakAfter: number): number {
  const { perHeart, globalMultiplier } = gameConfig.points;
  return Math.round(perHeart * globalMultiplier * streakMultiplier(streakAfter));
}

export function challengeReward(base: number): number {
  const { challengeMultiplier, globalMultiplier } = gameConfig.points;
  return Math.round(base * challengeMultiplier * globalMultiplier);
}

export function dateReward(base: number | undefined): number {
  const { defaultDatePoints, globalMultiplier } = gameConfig.points;
  return Math.round((base ?? defaultDatePoints) * globalMultiplier);
}

export function totalPoints(ledger: PointsEvent[]): number {
  return ledger.reduce((s, e) => s + e.amount, 0);
}

export function pointsInRange(ledger: PointsEvent[], from: DayKey, to: DayKey): number {
  return ledger.reduce((s, e) => (e.day >= from && e.day <= to ? s + e.amount : s), 0);
}

export function pointsByDay(ledger: PointsEvent[]): Map<DayKey, number> {
  const m = new Map<DayKey, number>();
  for (const e of ledger) m.set(e.day, (m.get(e.day) ?? 0) + e.amount);
  return m;
}
