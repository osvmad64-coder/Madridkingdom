/**
 * Configuración central de gamificación.
 * Cambia aquí puntos, bonus, rachas y frecuencia de retos: ningún
 * componente tiene estos valores escritos a mano.
 */
export const gameConfig = {
  points: {
    /** Puntos por registrar ❤️ en un día. */
    perHeart: 100,
    /** Cuántos registros por día dan puntos (los demás se guardan sin puntos). */
    rewardedHeartsPerDay: 1,
    /** Multiplicador global (eventos especiales, fines de semana…). */
    globalMultiplier: 1,
    /**
     * Multiplicador según la racha en curso al registrar.
     * Se aplica el tramo más alto alcanzado. Ej: { minStreak: 7, multiplier: 1.2 }.
     */
    streakMultipliers: [] as { minStreak: number; multiplier: number }[],
    /** Multiplicador para retos completados. */
    challengeMultiplier: 1,
    /** Puntos por cita realizada si la cita no define los suyos. */
    defaultDatePoints: 150,
  },

  streak: {
    /** Días sin registro permitidos sin romper la racha (0 = diario estricto). */
    allowedGapDays: 0,
    /** Milestones de racha y su bonus al alcanzarlos. */
    milestones: [
      { days: 3, bonus: 50, title: '¡3 días seguidos!' },
      { days: 7, bonus: 150, title: '¡Una semana entera!' },
      { days: 14, bonus: 300, title: '¡Dos semanas!' },
      { days: 30, bonus: 700, title: '¡Un mes completo!' },
      { days: 50, bonus: 1200, title: '¡50 días!' },
      { days: 100, bonus: 3000, title: '¡100 días!' },
    ],
  },

  challenges: {
    /** Porcentaje máximo de días del mes con reto (0.3 = 30%). */
    maxDaysRatio: 0.3,
    /** Porcentaje mínimo, para que siempre haya algo que hacer. */
    minDaysRatio: 0.15,
    /** Permite completar retos de días pasados del mes. */
    allowPastCompletion: true,
  },
} as const;

export type GameConfig = typeof gameConfig;
