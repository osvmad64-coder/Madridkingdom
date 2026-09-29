/** Modelo de retos privados (definido en models/types.ts para el estado global). */
export type {
  Challenge,
  ChallengeAssignment,
  ChallengeSnapshot,
  ChallengeStatus,
  ChallengeType,
  Difficulty,
} from '../../models/types';

/** Datos que el editor puede cambiar (lo demás lo gestiona el sistema). */
export interface ChallengeInput {
  title: string;
  description: string;
  text: string;
  emoji: string;
  type: import('../../models/types').ChallengeType;
  difficulty: import('../../models/types').Difficulty;
  tags: string[];
  points: number;
  active: boolean;
}
