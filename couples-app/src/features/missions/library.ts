import { CATEGORIES } from '../../content/dateOptions';
import { bestRunInRange } from '../../domain/streaks';
import { startOfWeek, weekdayIndex } from '../../domain/time';
import type { MissionArea, MissionParams, MissionTier } from './model';
import type { MonthData } from './service';

/**
 * Biblioteca INTERNA de 12 tipos de misión (no se edita desde la app).
 * Cada tipo define sus variantes (objetivo + dificultad), su título y cómo
 * medir el progreso con los datos reales del mes. Para agregar una condición
 * nueva basta con añadir otro tipo aquí.
 */
export interface MissionVariant {
  params: MissionParams;
  tier: MissionTier;
}

export interface MissionDef {
  id: string;
  area: MissionArea;
  emoji: string;
  variants: MissionVariant[];
  title: (p: MissionParams) => string;
  /** Ayuda corta bajo el título (opcional). */
  hint?: (p: MissionParams) => string;
  /** Valor actual hacia `target` (quien llama lo limita al objetivo). */
  progress: (m: MonthData, p: MissionParams) => number;
  /** ¿Es realista este mes? (p. ej. no pedir más retos de los que hay). */
  feasible?: (m: MonthData, p: MissionParams) => boolean;
  /** Parámetros extra elegidos al generar (p. ej. categoría de cita). */
  extra?: (m: MonthData, pick: <T>(list: T[]) => T) => Partial<MissionParams>;
}

const v = (target: number, tier: MissionTier): MissionVariant => ({ params: { target }, tier });
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const APP_PARTS = ['corazones', 'retos', 'posiciones', 'citas', 'notas', 'cartas', 'fechas'] as const;

export const MISSION_LIBRARY: MissionDef[] = [
  /* ───── ❤️ Corazones ───── */
  {
    id: 'hearts-days',
    area: 'hearts',
    emoji: '❤️',
    variants: [v(4, 'easy'), v(6, 'easy'), v(8, 'medium'), v(10, 'medium'), v(12, 'hard')],
    title: (p) => `Registrar ❤️ en ${p.target} días`,
    progress: (m) => m.heartDays.length,
  },
  {
    id: 'hearts-streak',
    area: 'hearts',
    emoji: '🔥',
    variants: [v(2, 'easy'), v(3, 'medium'), v(4, 'medium'), v(5, 'hard')],
    title: (p) => `Lograr una racha de ${p.target} días seguidos`,
    progress: (m) => bestRunInRange(m.heartDays, m.from, m.to),
  },
  {
    id: 'hearts-weekends',
    area: 'hearts',
    emoji: '🌙',
    variants: [v(2, 'easy'), v(3, 'medium'), v(4, 'hard')],
    title: (p) => `Registrar ❤️ en ${p.target} fines de semana`,
    hint: () => 'Cuenta un sábado o domingo con ❤️ por semana',
    progress: (m) => new Set(m.heartDays.filter((d) => weekdayIndex(d) >= 5).map(startOfWeek)).size,
    feasible: (m, p) => m.weekendCount >= p.target,
  },

  /* ───── 🎯 Retos del calendario ───── */
  {
    id: 'challenges-done',
    area: 'challenges',
    emoji: '🎯',
    variants: [v(2, 'easy'), v(3, 'medium'), v(4, 'medium'), v(5, 'hard')],
    title: (p) => `Completar ${p.target} ${plural(p.target, 'reto', 'retos')} del calendario`,
    progress: (m) => m.challengesDone.length,
    feasible: (m, p) => m.challengeDays.length - 1 >= p.target,
  },
  {
    id: 'challenges-on-day',
    area: 'challenges',
    emoji: '⏰',
    variants: [v(1, 'easy'), v(2, 'medium'), v(3, 'hard')],
    title: (p) => `Completar ${p.target} ${plural(p.target, 'reto', 'retos')} el mismo día que ${plural(p.target, 'toca', 'tocan')}`,
    progress: (m) => m.challengesOnDay,
    feasible: (m, p) => m.challengeDays.length - 2 >= p.target,
  },
  {
    id: 'challenges-weeks',
    area: 'challenges',
    emoji: '🗓️',
    variants: [v(2, 'medium'), v(3, 'hard')],
    title: (p) => `Completar retos en ${p.target} semanas distintas`,
    progress: (m) => new Set(m.challengesDone.map((a) => startOfWeek(a.day))).size,
    feasible: (m, p) => m.challengeWeeks >= p.target + 1,
  },

  /* ───── 💕 Citas ───── */
  {
    id: 'dates-done',
    area: 'dates',
    emoji: '💕',
    variants: [v(1, 'easy'), v(2, 'medium'), v(3, 'hard'), v(4, 'special')],
    title: (p) => `Completar ${p.target} ${plural(p.target, 'cita', 'citas')}`,
    progress: (m) => m.datesDone.length,
  },
  {
    id: 'dates-new',
    area: 'dates',
    emoji: '✨',
    variants: [v(1, 'medium'), v(2, 'hard')],
    title: (p) => `Estrenar ${p.target} ${plural(p.target, 'cita', 'citas')} que nunca habían hecho`,
    progress: (m) => m.newDatesDone,
  },
  {
    id: 'dates-category',
    area: 'dates',
    emoji: '🎨',
    variants: [v(1, 'medium')],
    title: (p) => `Completar una cita ${categoryAdjective(p.category)}`,
    progress: (m, p) => m.datesDone.filter((l) => l.snapshot?.category === p.category).length,
    extra: (m, pick) => ({ category: pick(m.libraryCategories.length ? m.libraryCategories : ['romantic']) }),
  },

  /* ───── ❤️‍🔥 Actividad general ───── */
  {
    id: 'active-days',
    area: 'activity',
    emoji: '📅',
    variants: [v(8, 'easy'), v(10, 'medium'), v(12, 'medium'), v(15, 'hard')],
    title: (p) => `Tener actividad juntos en ${p.target} días distintos`,
    hint: () => 'Corazones, retos, citas o notas: cualquier día cuenta',
    progress: (m) => m.activeDays,
  },
  {
    id: 'combo',
    area: 'activity',
    emoji: '❤️‍🔥',
    variants: [
      { params: { target: 6, combo: { hearts: 4, challenges: 1, dates: 1 } }, tier: 'medium' },
      { params: { target: 9, combo: { hearts: 6, challenges: 2, dates: 1 } }, tier: 'hard' },
      { params: { target: 13, combo: { hearts: 8, challenges: 3, dates: 2 } }, tier: 'special' },
    ],
    title: (p) => `Combo: ${p.combo!.hearts} ❤️ + ${p.combo!.challenges} ${plural(p.combo!.challenges, 'reto', 'retos')} + ${p.combo!.dates} ${plural(p.combo!.dates, 'cita', 'citas')}`,
    progress: (m, p) =>
      Math.min(m.heartDays.length, p.combo!.hearts) +
      Math.min(m.challengesDone.length, p.combo!.challenges) +
      Math.min(m.datesDone.length, p.combo!.dates),
    feasible: (m, p) => m.challengeDays.length - 1 >= p.combo!.challenges,
  },
  {
    id: 'explorer',
    area: 'activity',
    emoji: '🧭',
    variants: [v(3, 'easy'), v(4, 'medium'), v(5, 'hard')],
    title: (p) => `Usar ${p.target} partes distintas de la app`,
    hint: () => 'Corazones, retos, posiciones, citas, notas, cartas o fechas',
    progress: (m) => m.partsUsed.length,
  },
];

export function findMissionDef(id: string) {
  return MISSION_LIBRARY.find((d) => d.id === id);
}

const CATEGORY_ADJ: Record<string, string> = {
  romantic: 'romántica',
  fun: 'divertida',
  creative: 'creativa',
  outdoors: 'al aire libre',
  home: 'en casa',
  food: 'de comida',
  adventure: 'de aventura',
  movie: 'de película',
  cheap: 'económica',
  special: 'especial',
};

function categoryAdjective(id?: string) {
  return CATEGORY_ADJ[id ?? ''] ?? CATEGORIES.find((c) => c.id === id)?.label.toLowerCase() ?? 'especial';
}
