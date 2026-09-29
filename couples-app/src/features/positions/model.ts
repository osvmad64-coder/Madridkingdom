import type { DayKey, Difficulty, ID } from '../../models/types';

/** 💋 Posición especial: bonus opcional que aparece en algunos días con reto. */
export interface Position {
  id: ID;
  name: string;
  description: string;
  /** Id de categoría (ver content/positionOptions.ts). */
  category: string;
  difficulty: Difficulty;
  points: number;
  tags: string[];
  /** Imagen completa y miniatura en el almacén de medios (IndexedDB). */
  imageId?: ID;
  thumbId?: ID;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PositionSnapshot {
  name: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  points: number;
  imageId?: ID;
  thumbId?: ID;
}

export type PositionStatus = 'available' | 'completed';

export interface PositionAssignment {
  day: DayKey;
  positionId: ID;
  status: PositionStatus;
  completedAt?: number;
  snapshot: PositionSnapshot;
}

export interface PositionMonth {
  days: Record<DayKey, PositionAssignment>;
  /** Días con reto donde ya se "tiró el dado" (tengan o no posición). */
  rolled: DayKey[];
}
