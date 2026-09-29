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
    /** Puntos sugeridos al crear un reto nuevo. */
    defaultPoints: 150,
    /** Opciones rápidas de recompensa en el editor (también se puede escribir otra). */
    pointOptions: [50, 100, 150, 200, 300],
    /** Porcentaje máximo de días del mes con reto (0.3 = 30%). */
    maxDaysRatio: 0.3,
    /** Porcentaje mínimo, para que siempre haya algo que hacer. */
    minDaysRatio: 0.15,
    /** Permite completar retos de días pasados del mes. */
    allowPastCompletion: true,
  },

  positions: {
    /** Valor inicial de "positionFrequency" (editable en Ajustes → Posiciones). */
    defaultFrequency: 0.3,
    /** Opciones de frecuencia que ofrece la app. */
    frequencyOptions: [0, 0.15, 0.3, 0.5, 0.75],
    defaultPoints: 100,
    pointOptions: [50, 100, 150, 200],
  },

  dateNight: {
    /** Cuántas elecciones recientes recuerda Sorpréndenos para no repetir. */
    recentWindow: 5,
    /** Valor inicial de "evitar repetir durante X días" (0 = solo no repetir seguidas). */
    defaultAvoidRepeatDays: 0,
    pointOptions: [50, 100, 150, 200, 300],
  },
} as const;

export type GameConfig = typeof gameConfig;
