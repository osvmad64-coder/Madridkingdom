import { uid } from '../../domain/random';
import type { DayKey } from '../../models/types';
import { ok, type Action } from '../../store/core';
import type { FutureLetter } from './model';
import { findLetter, letterStatus } from './service';

/** Acciones de cartas para el futuro. */
export interface LetterInput {
  title: string;
  message: string;
  unlockOn?: DayKey;
  imageId?: string;
  thumbId?: string;
  fromId?: string;
  toId?: string;
}

const clean = (i: LetterInput): LetterInput => ({
  ...i,
  title: i.title.trim(),
  message: i.message.trim(),
  unlockOn: i.unlockOn || undefined,
});

export const createLetter =
  (input: LetterInput): Action =>
  (s, ctx) => {
    const l: FutureLetter = { ...clean(input), id: uid('lt_'), writtenOn: ctx.today, createdAt: ctx.now, updatedAt: ctx.now };
    return ok({ ...s, futureLetters: [l, ...s.futureLetters] }, [{ type: 'saved', text: 'Carta guardada 💌' }]);
  };

/** Solo mientras no se haya abierto. */
export const updateLetter =
  (id: string, input: LetterInput): Action =>
  (s, ctx) => {
    const cur = findLetter(s, id);
    if (!cur || cur.openedAt) return ok(s);
    return ok(
      { ...s, futureLetters: s.futureLetters.map((l) => (l.id === id ? { ...l, ...clean(input), updatedAt: ctx.now } : l)) },
      [{ type: 'saved', text: 'Cambios guardados' }],
    );
  };

export const deleteLetter =
  (id: string): Action =>
  (s) =>
    ok({ ...s, futureLetters: s.futureLetters.filter((l) => l.id !== id) }, [{ type: 'saved', text: 'Carta eliminada' }]);

/** Abre una carta disponible (queda en el archivo). No abre cartas bloqueadas. */
export const openLetter =
  (id: string): Action =>
  (s, ctx) => {
    const cur = findLetter(s, id);
    if (!cur || letterStatus(cur, ctx.today) !== 'ready') return ok(s);
    return ok({ ...s, futureLetters: s.futureLetters.map((l) => (l.id === id ? { ...l, openedAt: ctx.now, updatedAt: ctx.now } : l)) });
  };
