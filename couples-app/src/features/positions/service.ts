import { hashString, seededRng, type Rng } from '../../domain/random';
import type { AppState, DayKey, MonthKey } from '../../models/types';
import { challengeDays } from '../challenges/service';
import type { Position, PositionAssignment, PositionMonth, PositionSnapshot } from './model';

/**
 * Servicio de posiciones especiales (lógica pura).
 * Solo los días que ya tienen reto pueden recibir una posición, con una
 * probabilidad `settings.positionFrequency`. Cada día se sortea una sola vez.
 */

export function positionPool(s: Pick<AppState, 'positions'>): Position[] {
  return s.positions.filter((p) => p.active);
}

export function findPosition(s: Pick<AppState, 'positions'>, id: string) {
  return s.positions.find((p) => p.id === id);
}

export function positionSnapshot(p: Position): PositionSnapshot {
  return {
    name: p.name,
    description: p.description,
    category: p.category,
    difficulty: p.difficulty,
    points: p.points,
    imageId: p.imageId,
    thumbId: p.thumbId,
  };
}

export function positionAssignment(s: Pick<AppState, 'positionSchedule'>, day: DayKey) {
  return s.positionSchedule[day.slice(0, 7)]?.days[day];
}

/** Lo que se muestra: la posición viva o su copia (completada o eliminada). */
export function resolvePosition(s: Pick<AppState, 'positions'>, a: PositionAssignment) {
  const live = findPosition(s, a.positionId);
  const snap = a.status === 'completed' || !live ? a.snapshot : positionSnapshot(live);
  return { ...snap, id: a.positionId, deleted: !live, tags: live?.tags ?? [] };
}

export function pickPosition(pool: Position[], avoid: string[], rng: Rng): Position | undefined {
  const fresh = pool.filter((p) => !avoid.includes(p.id));
  const list = fresh.length ? fresh : pool;
  return list[Math.floor(rng() * list.length)];
}

const emptyMonth = (): PositionMonth => ({ days: {}, rolled: [] });

/** Última posición asignada antes de un día (para no repetir seguidas). */
function previousPositionId(schedule: Record<MonthKey, PositionMonth>, day: DayKey): string | undefined {
  const all = Object.values(schedule)
    .flatMap((m) => Object.values(m.days))
    .filter((a) => a.day < day)
    .sort((a, b) => a.day.localeCompare(b.day));
  return all[all.length - 1]?.positionId;
}

/**
 * Sortea posiciones para los días con reto de un mes que aún no se han
 * sorteado (de hoy en adelante). Si la biblioteca está vacía no sortea,
 * para que esos días puedan recibir posición cuando se agreguen.
 */
export function rollMonthPositions(
  s: Pick<AppState, 'positions' | 'positionSchedule' | 'challengeSchedule' | 'settings' | 'createdAt'>,
  month: MonthKey,
  today: DayKey,
): Record<MonthKey, PositionMonth> | null {
  const pool = positionPool(s);
  if (!pool.length) return null;
  const cur = s.positionSchedule[month] ?? emptyMonth();
  const pending = challengeDays(s.challengeSchedule, month).filter((d) => d >= today && !cur.rolled.includes(d));
  if (!pending.length) return null;

  let schedule = { ...s.positionSchedule, [month]: { days: { ...cur.days }, rolled: [...cur.rolled] } };
  for (const day of pending) {
    const rng = seededRng(hashString(`pos:${day}:${s.createdAt}`));
    const m = schedule[month];
    m.rolled.push(day);
    if (rng() >= s.settings.positionFrequency) continue;
    const prev = previousPositionId(schedule, day);
    const p = pickPosition(pool, prev ? [prev] : [], rng)!;
    m.days[day] = { day, positionId: p.id, status: 'available', snapshot: positionSnapshot(p) };
  }
  return schedule;
}

/**
 * Reemplaza (o quita, si no hay otra) las asignaciones no completadas de una
 * posición que se eliminó o desactivó.
 */
export function replacePositionAssignments(
  s: Pick<AppState, 'positions' | 'positionSchedule'>,
  shouldReplace: (a: PositionAssignment) => boolean,
  rng: Rng = Math.random,
): Record<MonthKey, PositionMonth> {
  const pool = positionPool(s);
  let schedule = s.positionSchedule;
  for (const month of Object.keys(schedule)) {
    for (const a of Object.values(schedule[month].days)) {
      if (a.status === 'completed' || !shouldReplace(a)) continue;
      const days = { ...schedule[month].days };
      const p = pickPosition(pool.filter((x) => x.id !== a.positionId), [], rng);
      if (p) days[a.day] = { day: a.day, positionId: p.id, status: 'available', snapshot: positionSnapshot(p) };
      else delete days[a.day];
      schedule = { ...schedule, [month]: { ...schedule[month], days } };
    }
  }
  return schedule;
}

export function completedPositions(schedule: Record<MonthKey, PositionMonth>): PositionAssignment[] {
  return Object.values(schedule)
    .flatMap((m) => Object.values(m.days))
    .filter((a) => a.status === 'completed');
}

/** Ids de imágenes que siguen en uso (biblioteca + historial) para no borrarlas. */
export function mediaInUse(s: Pick<AppState, 'positions' | 'positionSchedule' | 'dateIdeas' | 'futureLetters'>): Set<string> {
  const ids = new Set<string>();
  for (const p of s.positions) [p.imageId, p.thumbId].forEach((i) => i && ids.add(i));
  for (const m of Object.values(s.positionSchedule))
    for (const a of Object.values(m.days)) [a.snapshot.imageId, a.snapshot.thumbId].forEach((i) => i && ids.add(i));
  for (const d of s.dateIdeas) if (d.imageId) ids.add(d.imageId);
  for (const l of s.futureLetters ?? []) [l.imageId, l.thumbId].forEach((i) => i && ids.add(i));
  return ids;
}
