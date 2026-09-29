import type { AppState } from '../models/types';
import { demoDateIdeas } from '../content/demo/dateIdeas';
import { addDays, fromDayKey, monthKeyOf, todayKey } from '../domain/time';
import {
  applyAchievements,
  completeChallenge,
  completeDate,
  ensureCalendarMonth,
  makeCtx,
  planDate,
  registerHeart,
  toggleFavorite,
  type Action,
} from './actions';
import { createInitialState } from './initialState';

/**
 * Genera datos de ejemplo reproduciendo acciones reales día por día.
 * Útil para probar estadísticas, rachas y logros. Solo se usa al pulsar
 * "Cargar datos de ejemplo" en Ajustes. Conserva la biblioteca privada
 * (retos y posiciones) que ya exista.
 */
export function buildDemoState(now = Date.now(), keep?: Pick<AppState, 'challenges' | 'positions' | 'settings'>): AppState {
  let s = createInitialState(now - 70 * 86_400_000);
  if (keep) s = { ...s, challenges: keep.challenges, positions: keep.positions, settings: keep.settings };
  s.profile.partners[0].name = 'Sofía';
  s.profile.partners[1].name = 'Diego';
  const today = todayKey(new Date(now));
  // Citas de ejemplo en la biblioteca (la app real crece desde la propia app).
  s.dateIdeas = demoDateIdeas(now);
  const DATE_LIBRARY = s.dateIdeas;

  const run = (action: Action, day: string) => {
    const at = fromDayKey(day).getTime() + 20 * 3_600_000; // 8pm de ese día
    const ctx = makeCtx(Math.min(at, now));
    s = applyAchievements(action(s, ctx), ctx).state;
  };

  // Registros de los últimos 60 días con algunos huecos; los últimos 8 seguidos.
  for (let i = 60; i >= 0; i--) {
    const day = addDays(today, -i);
    run(ensureCalendarMonth(monthKeyOf(day)), day);
    const skip = i > 8 && (i % 4 === 0 || i % 7 === 3);
    if (!skip) run(registerHeart(day), day);
    const a = s.challengeSchedule[monthKeyOf(day)]?.[day];
    if (a && i % 2 === 0) run(completeChallenge(day), day);
  }

  // Citas: algunas realizadas, favoritas y una próxima.
  run(completeDate(DATE_LIBRARY[0].id), addDays(today, -20));
  run(completeDate(DATE_LIBRARY[2].id), addDays(today, -9));
  run(toggleFavorite(DATE_LIBRARY[0].id), today);
  run(toggleFavorite(DATE_LIBRARY[5].id), today);
  run(planDate(DATE_LIBRARY[5].id, addDays(today, 3)), today);
  return s;
}
