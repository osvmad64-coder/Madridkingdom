import { uid } from '../../domain/random';
import { monthKeyOf } from '../../domain/time';
import type { DayKey, Difficulty, MonthKey } from '../../models/types';
import { ok, pointsEvent, type Action } from '../../store/core';
import { canCompleteOn } from '../challenges/service';
import type { Position } from './model';
import {
  findPosition,
  positionAssignment,
  positionSnapshot,
  replacePositionAssignments,
  rollMonthPositions,
} from './service';

/** Acciones de posiciones: biblioteca (CRUD) + calendario. */

export interface PositionInput {
  name: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  points: number;
  tags: string[];
  imageId?: string;
  thumbId?: string;
  active: boolean;
}

const clean = (i: PositionInput) => ({
  ...i,
  name: i.name.trim(),
  description: i.description.trim(),
  points: Math.max(0, Math.round(i.points)),
});

export const createPosition =
  (input: PositionInput): Action =>
  (s, ctx) => {
    const p: Position = { ...clean(input), id: uid('pos_'), createdAt: ctx.now, updatedAt: ctx.now };
    const next = { ...s, positions: [p, ...s.positions] };
    // Si es la primera posición, los días con reto del mes actual ya pueden recibirla.
    const rolled = ensurePositionMonth(monthKeyOf(ctx.today))(next, ctx).state;
    return ok(rolled, [{ type: 'saved', text: 'Posición guardada' }]);
  };

export const updatePosition =
  (id: string, input: PositionInput): Action =>
  (s, ctx) => {
    const cur = findPosition(s, id);
    if (!cur) return ok(s);
    const p: Position = { ...cur, ...clean(input), updatedAt: ctx.now };
    const next = { ...s, positions: s.positions.map((x) => (x.id === id ? p : x)) };
    const positionSchedule = p.active
      ? next.positionSchedule
      : replacePositionAssignments(next, (a) => a.positionId === id && a.day >= ctx.today);
    return ok({ ...next, positionSchedule }, [{ type: 'saved', text: 'Cambios guardados' }]);
  };

export const deletePosition =
  (id: string): Action =>
  (s) => {
    const next = { ...s, positions: s.positions.filter((p) => p.id !== id) };
    return ok({ ...next, positionSchedule: replacePositionAssignments(next, (a) => a.positionId === id) }, [
      { type: 'saved', text: 'Posición eliminada' },
    ]);
  };

/** Sortea posiciones para los días con reto del mes (una sola vez por día). */
export const ensurePositionMonth =
  (month: MonthKey): Action =>
  (s, ctx) => {
    const positionSchedule = rollMonthPositions(s, month, ctx.today);
    return positionSchedule ? ok({ ...s, positionSchedule }) : ok(s);
  };

export const positionRef = (day: DayKey) => `position:${day}`;

function setAssignment(s: Parameters<Action>[0], day: DayKey, patch: object) {
  const month = monthKeyOf(day);
  const m = s.positionSchedule[month];
  return {
    ...s.positionSchedule,
    [month]: { ...m, days: { ...m.days, [day]: { ...m.days[day], ...patch } } },
  };
}

export const completePosition =
  (day: DayKey): Action =>
  (s, ctx) => {
    const a = positionAssignment(s, day);
    if (!a || a.status === 'completed' || !canCompleteOn(day, ctx.today)) return ok(s);
    const live = findPosition(s, a.positionId);
    const snapshot = live ? positionSnapshot(live) : a.snapshot;
    const pts = snapshot.points;
    return ok(
      {
        ...s,
        positionSchedule: setAssignment(s, day, { status: 'completed', completedAt: ctx.now, snapshot }),
        ledger: [...s.ledger, pointsEvent(ctx, day, pts, 'position', positionRef(day), `Posición: ${snapshot.name} 💋`)],
      },
      [
        { type: 'position', title: snapshot.name, points: pts },
        { type: 'points', amount: pts, label: '💋' },
      ],
    );
  };

export const undoPosition =
  (day: DayKey): Action =>
  (s) => {
    const a = positionAssignment(s, day);
    if (!a || a.status !== 'completed') return ok(s);
    return ok({
      ...s,
      positionSchedule: setAssignment(s, day, { status: 'available', completedAt: undefined }),
      ledger: s.ledger.filter((e) => e.refId !== positionRef(day)),
    });
  };

/** PositionPicker: cambia la posición de un día (solo si no está completada). */
export const swapPosition =
  (day: DayKey, positionId: string): Action =>
  (s) => {
    const a = positionAssignment(s, day);
    const p = findPosition(s, positionId);
    if (!a || !p || a.status === 'completed') return ok(s);
    return ok({ ...s, positionSchedule: setAssignment(s, day, { positionId, snapshot: positionSnapshot(p) }) });
  };
