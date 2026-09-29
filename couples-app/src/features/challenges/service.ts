import { gameConfig } from '../../config/game';
import { hashString, seededRng, shuffle, type Rng } from '../../domain/random';
import { daysInMonth, monthDays } from '../../domain/time';
import type { AppState, DayKey, MonthKey } from '../../models/types';
import type {
  Challenge,
  ChallengeAssignment,
  ChallengeSnapshot,
  ChallengeType,
  Difficulty,
} from './model';

/**
 * Servicio de retos privados (lógica pura).
 * La distribución de días por mes es la misma de la fase 1; lo único que
 * cambió es de dónde salen los retos: la biblioteca editable del estado.
 */

export type MonthSchedule = Record<DayKey, ChallengeAssignment>;

/* ───────────── Biblioteca ───────────── */

/** Retos que pueden salir en los sorteos: activos y de tipos permitidos. */
export function challengePool(s: Pick<AppState, 'challenges' | 'settings'>): Challenge[] {
  const types = s.settings.challengeTypes;
  return s.challenges.filter((c) => c.active && (!types.length || types.includes(c.type)));
}

export function findChallenge(s: Pick<AppState, 'challenges'>, id: string) {
  return s.challenges.find((c) => c.id === id);
}

export function snapshotOf(c: Challenge): ChallengeSnapshot {
  return {
    title: c.title,
    description: c.description,
    text: c.text,
    emoji: c.emoji,
    type: c.type,
    points: c.reward.points,
  };
}

/** Lo que se muestra de un día: el reto vivo o, si ya se completó o se borró, su copia. */
export function resolveChallenge(s: Pick<AppState, 'challenges'>, a: ChallengeAssignment) {
  const live = findChallenge(s, a.challengeId);
  const snap = a.status === 'completed' || !live ? a.snapshot : snapshotOf(live);
  return { ...snap, difficulty: live?.difficulty as Difficulty | undefined, deleted: !live, id: a.challengeId };
}

/* ───────────── Sorteo ───────────── */

/** Elige un reto evitando los ids indicados (si es posible). */
export function pickChallenge(pool: Challenge[], avoid: string[], rng: Rng): Challenge | undefined {
  const fresh = pool.filter((c) => !avoid.includes(c.id));
  const list = fresh.length ? fresh : pool;
  return list[Math.floor(rng() * list.length)];
}

/** Cuántos días del mes tendrán reto (respeta mínimo y máximo configurados). */
export function challengeDayCount(month: MonthKey, rng: () => number): number {
  const { maxDaysRatio, minDaysRatio } = gameConfig.challenges;
  const n = daysInMonth(month);
  const max = Math.floor(n * maxDaysRatio);
  const min = Math.min(max, Math.ceil(n * minDaysRatio));
  return min + Math.floor(rng() * (max - min + 1));
}

const assign = (day: DayKey, c: Challenge): ChallengeAssignment => ({
  day,
  challengeId: c.id,
  status: 'pending',
  snapshot: snapshotOf(c),
});

/**
 * Genera el calendario de retos de un mes.
 * `previousId` es el último reto del mes anterior (para no repetirlo seguido).
 */
export function generateMonthSchedule(
  month: MonthKey,
  pool: Challenge[],
  seed: number,
  previousId?: string,
): MonthSchedule {
  const rng = seededRng(hashString(`${month}:${seed}`));
  const days = monthDays(month);
  const schedule: MonthSchedule = {};
  const target = challengeDayCount(month, rng);
  if (!pool.length || target === 0) return schedule;

  // 1) Fechas especiales fijas (reservado para retos con fixedDate).
  const mm = month.slice(5, 7);
  for (const c of pool) {
    if (c.fixedDate && c.fixedDate.startsWith(mm)) {
      const day = `${month}-${c.fixedDate.slice(3, 5)}`;
      if (days.includes(day)) schedule[day] = assign(day, c);
    }
  }

  // 2) Días aleatorios (misma distribución de la fase 1).
  const regular = pool.filter((c) => !c.fixedDate);
  if (!regular.length) return schedule;
  const freeDays = shuffle(days.filter((d) => !schedule[d]), rng);
  const needed = Math.max(0, target - Object.keys(schedule).length);
  const chosen = freeDays.slice(0, needed).sort();

  // 3) Retos: sin repetir dentro del mes mientras haya opciones y nunca dos seguidos.
  let used: string[] = [];
  let last = previousId;
  for (const day of chosen) {
    if (used.length >= regular.length) used = [];
    const c = pickChallenge(regular, [...used, ...(last ? [last] : [])], rng)!;
    schedule[day] = assign(day, c);
    used.push(c.id);
    last = c.id;
  }
  return schedule;
}

/** Último reto asignado antes de un mes (para evitar repetición entre meses). */
export function lastChallengeBefore(
  schedule: Record<MonthKey, MonthSchedule>,
  month: MonthKey,
): string | undefined {
  const prev = Object.keys(schedule).filter((m) => m < month).sort().pop();
  if (!prev) return undefined;
  const days = Object.keys(schedule[prev]).sort();
  return days.length ? schedule[prev][days[days.length - 1]].challengeId : undefined;
}

/** Retos de los días vecinos (para que un reemplazo no repita al de al lado). */
function neighborIds(schedule: Record<MonthKey, MonthSchedule>, day: DayKey): string[] {
  const all = allAssignments(schedule).sort((a, b) => a.day.localeCompare(b.day));
  const i = all.findIndex((a) => a.day === day);
  return [all[i - 1], all[i + 1]].filter(Boolean).map((a) => a!.challengeId);
}

/**
 * Reemplaza por otro reto activo las asignaciones NO completadas que cumplan
 * `shouldReplace`. Si no hay otro reto disponible, conserva la copia guardada
 * (ningún día con reto queda vacío).
 */
export function replaceAssignments(
  schedule: Record<MonthKey, MonthSchedule>,
  pool: Challenge[],
  shouldReplace: (a: ChallengeAssignment) => boolean,
  rng: Rng = Math.random,
): Record<MonthKey, MonthSchedule> {
  let next = schedule;
  for (const month of Object.keys(schedule)) {
    for (const a of Object.values(schedule[month])) {
      if (a.status === 'completed' || !shouldReplace(a)) continue;
      const candidates = pool.filter((c) => c.id !== a.challengeId);
      if (!candidates.length) continue;
      const c = pickChallenge(candidates, neighborIds(next, a.day), rng)!;
      next = { ...next, [month]: { ...next[month], [a.day]: assign(a.day, c) } };
    }
  }
  return next;
}

export function canCompleteOn(day: DayKey, today: DayKey): boolean {
  if (day > today) return false;
  return day === today || gameConfig.challenges.allowPastCompletion;
}

export function allAssignments(schedule: Record<MonthKey, MonthSchedule>): ChallengeAssignment[] {
  return Object.values(schedule).flatMap((m) => Object.values(m));
}

export function completedAssignments(
  schedule: Record<MonthKey, MonthSchedule>,
  from?: DayKey,
  to?: DayKey,
): ChallengeAssignment[] {
  return allAssignments(schedule).filter(
    (a) => a.status === 'completed' && (!from || a.day >= from) && (!to || a.day <= to),
  );
}

/** Días con reto de un mes, ordenados. */
export function challengeDays(schedule: Record<MonthKey, MonthSchedule>, month: MonthKey): DayKey[] {
  return Object.keys(schedule[month] ?? {}).sort();
}

export const CHALLENGE_TYPES: { id: ChallengeType; label: string; emoji: string }[] = [
  { id: 'romantic', label: 'Sensual', emoji: '💋' },
  { id: 'experience', label: 'Experiencia', emoji: '🔥' },
  { id: 'surprise', label: 'Sorpresa', emoji: '🎁' },
  { id: 'bonus', label: 'Bonus', emoji: '✨' },
  { id: 'special', label: 'Especial', emoji: '💘' },
];

export const CHALLENGE_TYPE_LABEL = Object.fromEntries(CHALLENGE_TYPES.map((t) => [t.id, t.label])) as Record<
  ChallengeType,
  string
>;

export const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Suave' },
  { id: 'medium', label: 'Intenso' },
  { id: 'hard', label: 'Atrevido' },
];

export const DIFFICULTY_LABEL = Object.fromEntries(DIFFICULTIES.map((d) => [d.id, d.label])) as Record<
  Difficulty,
  string
>;
