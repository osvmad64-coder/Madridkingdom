import type { ID, MonthKey } from '../../models/types';

/** 🎯 Misiones del mes (generadas por el sistema, no editables). */

export type MissionArea = 'hearts' | 'challenges' | 'dates' | 'activity';
export type MissionTier = 'easy' | 'medium' | 'hard' | 'special';

/** Parámetros concretos de una misión generada (objetivo y extras). */
export interface MissionParams {
  target: number;
  /** Misión combo: objetivos por área. */
  combo?: { hearts: number; challenges: number; dates: number };
  /** Misión por categoría de cita. */
  category?: string;
}

export interface MonthlyMission {
  /** `${month}:${defId}` — estable para sincronizar. */
  id: ID;
  defId: string;
  area: MissionArea;
  tier: MissionTier;
  points: number;
  emoji: string;
  /** Texto generado al crear el mes (se conserva en el historial). */
  title: string;
  params: MissionParams;
  /** Cuándo se reclamaron sus puntos (una sola vez). */
  claimedAt?: number;
}

export interface MissionMonth {
  month: MonthKey;
  generatedAt: number;
  missions: MonthlyMission[];
  /** Bonus por completar todas (una sola vez). */
  bonusClaimedAt?: number;
  bonusPoints: number;
}
