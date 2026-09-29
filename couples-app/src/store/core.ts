import { uid } from '../domain/random';
import { todayKey } from '../domain/time';
import type { AppState, DayKey, PointsEvent, PointsSource } from '../models/types';

/**
 * Núcleo de acciones: tipos compartidos por todos los módulos.
 * Una acción es una función PURA (estado, contexto) → { estado, efectos }.
 * Los efectos son eventos para la UI (animaciones), nunca se ejecutan aquí.
 */

export type Effect =
  | { type: 'points'; amount: number; label: string }
  | { type: 'heart'; day: DayKey }
  | { type: 'milestone'; days: number; title: string; bonus: number }
  | { type: 'achievement'; id: string; title: string; emoji: string }
  | { type: 'challenge'; title: string; points: number }
  | { type: 'position'; title: string; points: number }
  | { type: 'favorite'; added: boolean }
  | { type: 'saved'; text: string }
  | { type: 'date-done'; title: string; points: number };

export interface Ctx {
  now: number;
  today: DayKey;
}

export interface Result {
  state: AppState;
  effects: Effect[];
}

export type Action = (s: AppState, ctx: Ctx) => Result;

export const makeCtx = (now = Date.now()): Ctx => ({ now, today: todayKey(new Date(now)) });

export const ok = (state: AppState, effects: Effect[] = []): Result => ({ state, effects });

/** Encadena acciones (el estado de una es la entrada de la siguiente). */
export const chain =
  (...actions: Action[]): Action =>
  (s, ctx) =>
    actions.reduce<Result>(
      (acc, a) => {
        const r = a(acc.state, ctx);
        return { state: r.state, effects: [...acc.effects, ...r.effects] };
      },
      { state: s, effects: [] },
    );

export function pointsEvent(
  ctx: Ctx,
  day: DayKey,
  amount: number,
  source: PointsSource,
  refId: string,
  label: string,
): PointsEvent {
  return { id: uid('pt_'), day, createdAt: ctx.now, amount, source, refId, label };
}
