import type { AppState, DayKey } from '../../models/types';
import type { FutureLetter, LetterStatus } from './model';

/**
 * Servicio de cartas. El estado se calcula SIEMPRE contra la fecha real de
 * hoy (no se guarda "desbloqueada"), así una carta se abre sola al llegar su día.
 */
export function letterStatus(l: FutureLetter, today: DayKey): LetterStatus {
  if (l.openedAt) return 'opened';
  if (l.unlockOn && l.unlockOn > today) return 'locked';
  return 'ready';
}

export function lettersByStatus(s: Pick<AppState, 'futureLetters'>, today: DayKey) {
  const out: Record<LetterStatus, FutureLetter[]> = { locked: [], ready: [], opened: [] };
  for (const l of s.futureLetters) out[letterStatus(l, today)].push(l);
  out.locked.sort((a, b) => (a.unlockOn ?? '').localeCompare(b.unlockOn ?? ''));
  out.ready.sort((a, b) => a.createdAt - b.createdAt);
  out.opened.sort((a, b) => (b.openedAt ?? 0) - (a.openedAt ?? 0));
  return out;
}

/** Las cartas se sellan al guardarse: nadie puede editarlas ni leerlas antes de su fecha. */
export const canEditLetter = (_l: FutureLetter) => false;

export function findLetter(s: Pick<AppState, 'futureLetters'>, id: string) {
  return s.futureLetters.find((l) => l.id === id);
}
