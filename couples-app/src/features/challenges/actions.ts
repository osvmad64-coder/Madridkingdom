import { challengeReward } from '../../domain/points';
import { uid } from '../../domain/random';
import { monthKeyOf } from '../../domain/time';
import type { DayKey, MonthKey } from '../../models/types';
import { ok, pointsEvent, type Action } from '../../store/core';
import type { Challenge, ChallengeInput } from './model';
import {
  canCompleteOn,
  challengePool,
  findChallenge,
  generateMonthSchedule,
  lastChallengeBefore,
  replaceAssignments,
  snapshotOf,
} from './service';

/** Acciones de retos privados: biblioteca (CRUD) + calendario. */

/* ───────────── Biblioteca ───────────── */

function toChallenge(input: ChallengeInput, base: Partial<Challenge>, now: number): Challenge {
  return {
    id: base.id ?? uid('ch_'),
    title: input.title.trim(),
    description: input.description.trim() || input.text.trim().slice(0, 140),
    text: input.text.trim() || undefined,
    emoji: input.emoji || '❤️',
    type: input.type,
    difficulty: input.difficulty,
    tags: input.tags,
    reward: { points: Math.max(0, Math.round(input.points)) },
    active: input.active,
    source: base.source ?? 'user',
    fixedDate: base.fixedDate,
    createdAt: base.createdAt ?? now,
    updatedAt: now,
  };
}

export const createChallenge =
  (input: ChallengeInput): Action =>
  (s, ctx) => {
    const c = toChallenge(input, {}, ctx.now);
    return ok({ ...s, challenges: [c, ...s.challenges] }, [{ type: 'saved', text: 'Reto guardado' }]);
  };

export const updateChallenge =
  (id: string, input: ChallengeInput): Action =>
  (s, ctx) => {
    const cur = findChallenge(s, id);
    if (!cur) return ok(s);
    const c = toChallenge(input, cur, ctx.now);
    const next = { ...s, challenges: s.challenges.map((x) => (x.id === id ? c : x)) };
    // Si quedó inactivo, sus días pendientes (de hoy en adelante) reciben otro reto.
    const schedule = c.active
      ? next.challengeSchedule
      : replaceAssignments(next.challengeSchedule, challengePool(next), (a) => a.challengeId === id && a.day >= ctx.today);
    return ok({ ...next, challengeSchedule: schedule }, [{ type: 'saved', text: 'Cambios guardados' }]);
  };

export const setChallengeActive =
  (id: string, active: boolean): Action =>
  (s, ctx) => {
    const cur = findChallenge(s, id);
    if (!cur) return ok(s);
    const { reward, ...rest } = cur;
    return updateChallenge(id, { ...rest, text: rest.text ?? '', points: reward.points, active })(s, ctx);
  };

/**
 * Elimina un reto de la biblioteca. Los días completados conservan su copia;
 * los pendientes reciben otro reto activo al azar (ningún día queda vacío).
 */
export const deleteChallenge =
  (id: string): Action =>
  (s) => {
    const next = { ...s, challenges: s.challenges.filter((c) => c.id !== id) };
    const challengeSchedule = replaceAssignments(next.challengeSchedule, challengePool(next), (a) => a.challengeId === id);
    return ok({ ...next, challengeSchedule }, [{ type: 'saved', text: 'Reto eliminado' }]);
  };

/* ───────────── Calendario ───────────── */

/** Genera el calendario de retos del mes si aún no existe. */
export const ensureChallengeMonth =
  (month: MonthKey): Action =>
  (s) => {
    if (s.challengeSchedule[month]) return ok(s);
    const schedule = generateMonthSchedule(
      month,
      challengePool(s),
      s.createdAt,
      lastChallengeBefore(s.challengeSchedule, month),
    );
    return ok({ ...s, challengeSchedule: { ...s.challengeSchedule, [month]: schedule } });
  };

export const challengeRef = (day: DayKey) => `challenge:${day}`;

export const completeChallenge =
  (day: DayKey): Action =>
  (s, ctx) => {
    const month = monthKeyOf(day);
    const a = s.challengeSchedule[month]?.[day];
    if (!a || a.status === 'completed' || !canCompleteOn(day, ctx.today)) return ok(s);
    const live = findChallenge(s, a.challengeId);
    // Se congela la copia del contenido usado en este momento (historial).
    const snapshot = live ? snapshotOf(live) : a.snapshot;
    const pts = challengeReward(snapshot.points);
    return ok(
      {
        ...s,
        challengeSchedule: {
          ...s.challengeSchedule,
          [month]: { ...s.challengeSchedule[month], [day]: { ...a, status: 'completed', completedAt: ctx.now, snapshot } },
        },
        ledger: [...s.ledger, pointsEvent(ctx, day, pts, 'challenge', challengeRef(day), `Reto: ${snapshot.title} 🎯`)],
      },
      [
        { type: 'challenge', title: snapshot.title, points: pts },
        { type: 'points', amount: pts, label: '⭐' },
      ],
    );
  };

export const undoChallenge =
  (day: DayKey): Action =>
  (s) => {
    const month = monthKeyOf(day);
    const a = s.challengeSchedule[month]?.[day];
    if (!a || a.status !== 'completed') return ok(s);
    return ok({
      ...s,
      challengeSchedule: {
        ...s.challengeSchedule,
        [month]: { ...s.challengeSchedule[month], [day]: { ...a, status: 'pending', completedAt: undefined } },
      },
      ledger: s.ledger.filter((e) => e.refId !== challengeRef(day)),
    });
  };

