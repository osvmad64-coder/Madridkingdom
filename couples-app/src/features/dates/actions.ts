import { dateReward } from '../../domain/points';
import { uid } from '../../domain/random';
import type { DateFilters, DayKey } from '../../models/types';
import { ok, pointsEvent, type Action } from '../../store/core';
import type { DateIdea, DateInput } from './model';
import { dateSnapshot, findIdea, pushRecent } from './service';

/** Acciones de la biblioteca de citas: CRUD, favoritas, historial y filtros. */

function cleanInput(i: DateInput): DateInput {
  const lines = (l: string[]) => l.map((x) => x.trim()).filter(Boolean);
  return {
    ...i,
    title: i.title.trim(),
    description: i.description.trim(),
    tags: lines(i.tags),
    preparation: lines(i.preparation),
    instructions: lines(i.instructions),
    optionalTwist: i.optionalTwist?.trim() || undefined,
    points: Math.max(0, Math.round(i.points)),
    location: i.location.length ? i.location : ['anywhere'],
  };
}

export const createDateIdea =
  (input: DateInput, favorite = false): Action =>
  (s, ctx) => {
    const idea: DateIdea = { ...cleanInput(input), id: uid('date_'), createdAt: ctx.now, updatedAt: ctx.now };
    const favorites = favorite ? [idea.id, ...s.dates.favorites] : s.dates.favorites;
    return ok({ ...s, dateIdeas: [idea, ...s.dateIdeas], dates: { ...s.dates, favorites } }, [
      { type: 'saved', text: 'Cita guardada en su biblioteca' },
    ]);
  };

export const updateDateIdea =
  (id: string, input: DateInput, favorite?: boolean): Action =>
  (s, ctx) => {
    const cur = findIdea(s.dateIdeas, id);
    if (!cur) return ok(s);
    const idea: DateIdea = { ...cur, ...cleanInput(input), updatedAt: ctx.now };
    let favorites = s.dates.favorites;
    if (favorite !== undefined) {
      favorites = favorites.filter((f) => f !== id);
      if (favorite) favorites = [id, ...favorites];
    }
    return ok(
      { ...s, dateIdeas: s.dateIdeas.map((x) => (x.id === id ? idea : x)), dates: { ...s.dates, favorites } },
      [{ type: 'saved', text: 'Cambios guardados' }],
    );
  };

/**
 * Elimina una cita. El historial de citas realizadas se conserva con una copia;
 * los planes pendientes de esa cita se quitan.
 */
export const deleteDateIdea =
  (id: string): Action =>
  (s) => {
    const idea = findIdea(s.dateIdeas, id);
    if (!idea) return ok(s);
    const snapshot = dateSnapshot(idea);
    const logs = s.dates.logs
      .filter((l) => !(l.ideaId === id && l.status === 'planned'))
      .map((l) => (l.ideaId === id ? { ...l, snapshot } : l));
    return ok(
      {
        ...s,
        dateIdeas: s.dateIdeas.filter((i) => i.id !== id),
        dates: {
          ...s.dates,
          logs,
          favorites: s.dates.favorites.filter((f) => f !== id),
          recent: s.dates.recent.filter((r) => r.id !== id),
        },
      },
      [{ type: 'saved', text: 'Cita eliminada' }],
    );
  };

export const toggleFavorite =
  (ideaId: string): Action =>
  (s) => {
    const has = s.dates.favorites.includes(ideaId);
    const favorites = has ? s.dates.favorites.filter((f) => f !== ideaId) : [ideaId, ...s.dates.favorites];
    return ok({ ...s, dates: { ...s.dates, favorites } }, [{ type: 'favorite', added: !has }]);
  };

export const markShown =
  (ideaId: string): Action =>
  (s, ctx) =>
    ok({ ...s, dates: { ...s.dates, recent: pushRecent(s.dates.recent, ideaId, ctx.now) } });

export const setDateFilters =
  (filters: DateFilters): Action =>
  (s) =>
    ok({ ...s, dates: { ...s.dates, filters } });

/** "Empezar" o "Planear": agrega la cita a pendientes/próximas. */
export const planDate =
  (ideaId: string, plannedFor?: DayKey): Action =>
  (s, ctx) => {
    const idea = findIdea(s.dateIdeas, ideaId);
    if (!idea) return ok(s);
    const existing = s.dates.logs.find((l) => l.ideaId === ideaId && l.status === 'planned');
    if (existing) {
      const logs = s.dates.logs.map((l) => (l === existing ? { ...l, plannedFor } : l));
      return ok({ ...s, dates: { ...s.dates, logs } });
    }
    const log = {
      id: uid('d_'),
      ideaId,
      status: 'planned' as const,
      createdAt: ctx.now,
      plannedFor,
      snapshot: dateSnapshot(idea),
    };
    return ok({ ...s, dates: { ...s.dates, logs: [log, ...s.dates.logs] } });
  };

/** Marca una cita como realizada (desde un plan o directamente). */
export const completeDate =
  (ideaId: string, note?: string): Action =>
  (s, ctx) => {
    const idea = findIdea(s.dateIdeas, ideaId);
    if (!idea) return ok(s);
    const pts = dateReward(idea.points);
    const planned = s.dates.logs.find((l) => l.ideaId === ideaId && l.status === 'planned');
    const done = {
      ...(planned ?? { id: uid('d_'), ideaId, createdAt: ctx.now }),
      status: 'done' as const,
      doneAt: ctx.now,
      doneDay: ctx.today,
      note: note?.trim() || planned?.note,
      snapshot: dateSnapshot(idea),
    };
    const logs = planned ? s.dates.logs.map((l) => (l === planned ? done : l)) : [done, ...s.dates.logs];
    return ok(
      {
        ...s,
        dates: { ...s.dates, logs },
        ledger: [...s.ledger, pointsEvent(ctx, ctx.today, pts, 'date', done.id, `Cita: ${idea.title} 💕`)],
      },
      [
        { type: 'date-done', title: idea.title, points: pts },
        { type: 'points', amount: pts, label: '💕' },
      ],
    );
  };

export const removeDateLog =
  (logId: string): Action =>
  (s) =>
    ok({
      ...s,
      dates: { ...s.dates, logs: s.dates.logs.filter((l) => l.id !== logId) },
      ledger: s.dates.logs.some((l) => l.id === logId && l.status === 'done')
        ? s.ledger.filter((e) => e.refId !== logId)
        : s.ledger,
    });
