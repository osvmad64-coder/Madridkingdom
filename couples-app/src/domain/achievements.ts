import type { Achievement, AchievementMetric } from '../models/types';

/** Logros: se evalúan contra métricas derivadas del estado. */

export type Metrics = Record<AchievementMetric, number>;

export interface AchievementProgress {
  achievement: Achievement;
  value: number;
  progress: number; // 0..1
  unlocked: boolean;
  unlockedAt?: number;
}

export function evaluateAchievements(
  list: Achievement[],
  metrics: Metrics,
  unlocked: Record<string, number>,
): AchievementProgress[] {
  return list.map((a) => {
    const value = metrics[a.metric] ?? 0;
    const reached = value >= a.target;
    return {
      achievement: a,
      value: Math.min(value, a.target),
      progress: Math.min(1, value / a.target),
      unlocked: reached || a.id in unlocked,
      unlockedAt: unlocked[a.id],
    };
  });
}

/** Logros recién alcanzados que aún no estaban marcados como desbloqueados. */
export function newlyUnlocked(
  list: Achievement[],
  metrics: Metrics,
  unlocked: Record<string, number>,
): Achievement[] {
  return list.filter((a) => !(a.id in unlocked) && (metrics[a.metric] ?? 0) >= a.target);
}
