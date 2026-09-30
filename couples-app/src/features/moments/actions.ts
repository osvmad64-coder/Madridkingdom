import { uid } from '../../domain/random';
import { ok, type Action } from '../../store/core';
import type { ImportantDate } from './model';

/** Acciones de fechas importantes. */
export type MomentInput = Pick<ImportantDate, 'kind' | 'title' | 'date' | 'emoji' | 'note' | 'recurring'>;

const clean = (i: MomentInput): MomentInput => ({ ...i, title: i.title.trim(), note: i.note?.trim() || undefined });

export const createMoment =
  (input: MomentInput): Action =>
  (s, ctx) => {
    const m: ImportantDate = { ...clean(input), id: uid('mo_'), createdAt: ctx.now, updatedAt: ctx.now };
    return ok({ ...s, importantDates: [...s.importantDates, m] }, [{ type: 'saved', text: 'Fecha guardada' }]);
  };

export const updateMoment =
  (id: string, input: MomentInput): Action =>
  (s, ctx) =>
    ok(
      {
        ...s,
        importantDates: s.importantDates.map((m) => (m.id === id ? { ...m, ...clean(input), updatedAt: ctx.now } : m)),
      },
      [{ type: 'saved', text: 'Cambios guardados' }],
    );

export const deleteMoment =
  (id: string): Action =>
  (s) =>
    ok({ ...s, importantDates: s.importantDates.filter((m) => m.id !== id) }, [{ type: 'saved', text: 'Fecha eliminada' }]);
