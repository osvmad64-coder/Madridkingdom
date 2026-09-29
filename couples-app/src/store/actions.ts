import { gameConfig } from '../config/game';
import { ACHIEVEMENTS } from '../content/achievements';
import { newlyUnlocked } from '../domain/achievements';
import { canCompleteOn, generateMonthSchedule } from '../domain/challenges';
import { findIdea, pushRecent } from '../domain/dateNight';
import { challengeReward, dateReward, heartReward } from '../domain/points';
import { uid } from '../domain/random';
import { computeRuns, crossedMilestones } from '../domain/streaks';
import { monthKeyOf, todayKey } from '../domain/time';
import type {
  AppState,
  CoupleProfile,
  DateCategory,
  DayKey,
  MonthKey,
  PointsEvent,
  PointsSource,
  RandomIngredient,
  Settings,
} from '../models/types';
import { DATE_LIBRARY } from '../content/dateIdeas';
import { createInitialState } from './initialState';
import { findChallenge, selectChallengePool, selectHeartDays, selectMetrics } from './selectors';

/**
 * Acciones: funciones PURAS (estado, contexto) → { estado nuevo, efectos }.
 * Los efectos son eventos para la UI (animaciones, celebraciones),
 * nunca se ejecutan aquí.
 */

export type Effect =
  | { type: 'points'; amount: number; label: string }
  | { type: 'heart'; day: DayKey }
  | { type: 'milestone'; days: number; title: string; bonus: number }
  | { type: 'achievement'; id: string; title: string; emoji: string }
  | { type: 'challenge'; title: string; points: number }
  | { type: 'favorite'; added: boolean }
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

const ok = (state: AppState, effects: Effect[] = []): Result => ({ state, effects });

function pointsEvent(
  ctx: Ctx,
  day: DayKey,
  amount: number,
  source: PointsSource,
  refId: string,
  label: string,
): PointsEvent {
  return { id: uid('pt_'), day, createdAt: ctx.now, amount, source, refId, label };
}

/* ───────────── Our Intimacy ───────────── */

export const registerHeart =
  (day: DayKey, note?: string): Action =>
  (s, ctx) => {
    if (day > ctx.today) return ok(s);
    const daysBefore = selectHeartDays(s);
    const alreadyToday = s.hearts.filter((h) => h.day === day).length;
    const entry = { id: uid('h_'), day, createdAt: ctx.now, note: note?.trim() || undefined };
    const effects: Effect[] = [{ type: 'heart', day }];
    const ledger = [...s.ledger];

    // Racha antes/después para detectar milestones cruzados.
    const runsAfter = computeRuns([...daysBefore, day]);
    const run = runsAfter.find((r) => r.start <= day && day <= r.end)!;
    const before = computeRuns(daysBefore)
      .filter((r) => r.start >= run.start && r.end <= run.end)
      .reduce((m, r) => Math.max(m, r.length), 0);

    const { rewardedHeartsPerDay } = gameConfig.points;
    if (alreadyToday < rewardedHeartsPerDay) {
      const pts = heartReward(run.length);
      ledger.push(pointsEvent(ctx, day, pts, 'heart', entry.id, 'Registro ❤️'));
      effects.push({ type: 'points', amount: pts, label: '❤️' });
    }
    if (alreadyToday === 0) {
      for (const m of crossedMilestones(before, run.length)) {
        ledger.push(pointsEvent(ctx, day, m.bonus, 'streak', entry.id, `Racha de ${m.days} días 🔥`));
        effects.push({ type: 'milestone', days: m.days, title: m.title, bonus: m.bonus });
      }
    }
    return ok({ ...s, hearts: [...s.hearts, entry], ledger }, effects);
  };

export const removeHeartsForDay =
  (day: DayKey): Action =>
  (s) => {
    const ids = new Set(s.hearts.filter((h) => h.day === day).map((h) => h.id));
    if (!ids.size) return ok(s);
    return ok({
      ...s,
      hearts: s.hearts.filter((h) => !ids.has(h.id)),
      ledger: s.ledger.filter((e) => !ids.has(e.refId)),
    });
  };

export const setDayNote =
  (day: DayKey, note: string): Action =>
  (s) => {
    const dayNotes = { ...s.dayNotes };
    if (note.trim()) dayNotes[day] = note.trim();
    else delete dayNotes[day];
    return ok({ ...s, dayNotes });
  };

/* ───────────── Retos ───────────── */

/** Genera el calendario de retos del mes si aún no existe. */
export const ensureMonthSchedule =
  (month: MonthKey): Action =>
  (s) => {
    if (s.challengeSchedule[month]) return ok(s);
    const schedule = generateMonthSchedule(month, selectChallengePool(s), s.createdAt);
    return ok({ ...s, challengeSchedule: { ...s.challengeSchedule, [month]: schedule } });
  };

const challengeRef = (day: DayKey) => `challenge:${day}`;

export const completeChallenge =
  (day: DayKey): Action =>
  (s, ctx) => {
    const month = monthKeyOf(day);
    const a = s.challengeSchedule[month]?.[day];
    if (!a || a.status === 'completed' || !canCompleteOn(day, ctx.today)) return ok(s);
    const c = findChallenge(s, a.challengeId);
    const pts = challengeReward(c?.reward.points ?? 0);
    return ok(
      {
        ...s,
        challengeSchedule: {
          ...s.challengeSchedule,
          [month]: {
            ...s.challengeSchedule[month],
            [day]: { ...a, status: 'completed', completedAt: ctx.now },
          },
        },
        ledger: [...s.ledger, pointsEvent(ctx, day, pts, 'challenge', challengeRef(day), `Reto: ${c?.title ?? ''} 🎯`)],
      },
      [
        { type: 'challenge', title: c?.title ?? 'Reto', points: pts },
        { type: 'points', amount: pts, label: '🎯' },
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

/* ───────────── Date Night ───────────── */

export const toggleFavorite =
  (ideaId: string): Action =>
  (s) => {
    const has = s.dates.favorites.includes(ideaId);
    const favorites = has ? s.dates.favorites.filter((f) => f !== ideaId) : [ideaId, ...s.dates.favorites];
    return ok({ ...s, dates: { ...s.dates, favorites } }, [{ type: 'favorite', added: !has }]);
  };

export const markShown =
  (ideaId: string): Action =>
  (s) =>
    ok({ ...s, dates: { ...s.dates, recent: pushRecent(s.dates.recent, ideaId) } });

/** "Empezar": agrega la cita a pendientes/próximas. */
export const planDate =
  (ideaId: string, plannedFor?: DayKey): Action =>
  (s, ctx) => {
    const existing = s.dates.logs.find((l) => l.ideaId === ideaId && l.status === 'planned');
    if (existing) {
      const logs = s.dates.logs.map((l) => (l === existing ? { ...l, plannedFor } : l));
      return ok({ ...s, dates: { ...s.dates, logs } });
    }
    const log = { id: uid('d_'), ideaId, status: 'planned' as const, createdAt: ctx.now, plannedFor };
    return ok({ ...s, dates: { ...s.dates, logs: [log, ...s.dates.logs] } });
  };

/** Marca una cita como realizada (desde un plan o directamente). */
export const completeDate =
  (ideaId: string, note?: string): Action =>
  (s, ctx) => {
    const idea = findIdea(DATE_LIBRARY, ideaId);
    const pts = dateReward(idea?.points);
    const planned = s.dates.logs.find((l) => l.ideaId === ideaId && l.status === 'planned');
    const done = {
      ...(planned ?? { id: uid('d_'), ideaId, createdAt: ctx.now }),
      status: 'done' as const,
      doneAt: ctx.now,
      doneDay: ctx.today,
      note: note?.trim() || planned?.note,
    };
    const logs = planned ? s.dates.logs.map((l) => (l === planned ? done : l)) : [done, ...s.dates.logs];
    return ok(
      {
        ...s,
        dates: { ...s.dates, logs },
        ledger: [...s.ledger, pointsEvent(ctx, ctx.today, pts, 'date', done.id, `Cita: ${idea?.title ?? ''} 💕`)],
      },
      [
        { type: 'date-done', title: idea?.title ?? 'Cita', points: pts },
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
      ledger: s.ledger.filter((e) => e.refId !== logId),
    });

/* ───────────── Perfil y ajustes ───────────── */

export const updateProfile =
  (patch: Partial<CoupleProfile>): Action =>
  (s) =>
    ok({ ...s, profile: { ...s.profile, ...patch } });

export const updatePartner =
  (index: 0 | 1, patch: Partial<CoupleProfile['partners'][number]>): Action =>
  (s) => {
    const partners = [...s.profile.partners] as CoupleProfile['partners'];
    partners[index] = { ...partners[index], ...patch };
    return ok({ ...s, profile: { ...s.profile, partners } });
  };

export const updateSettings =
  (patch: Partial<Settings>): Action =>
  (s) =>
    ok({ ...s, settings: { ...s.settings, ...patch } });

export const toggleCategory =
  (id: DateCategory): Action =>
  (s) => {
    const list = s.settings.enabledCategories;
    const next = list.includes(id) ? list.filter((c) => c !== id) : [...list, id];
    if (!next.length) return ok(s); // siempre al menos una
    return ok({ ...s, settings: { ...s.settings, enabledCategories: next } });
  };

export const toggleIngredient =
  (id: RandomIngredient): Action =>
  (s) => {
    const cur = s.settings.randomIngredients;
    const next = { ...cur, [id]: !cur[id] };
    if (!Object.values(next).some(Boolean)) return ok(s); // siempre al menos uno
    return ok({ ...s, settings: { ...s.settings, randomIngredients: next } });
  };

export const resetAll: Action = (_s, ctx) => ok(createInitialState(ctx.now));

export const replaceState =
  (next: AppState): Action =>
  () =>
    ok(next);

/* ───────────── Post-proceso: logros ───────────── */

/** Se ejecuta después de cada acción: desbloquea logros nuevos. */
export function applyAchievements(res: Result, ctx: Ctx): Result {
  const fresh = newlyUnlocked(ACHIEVEMENTS, selectMetrics(res.state), res.state.achievementsUnlocked);
  if (!fresh.length) return res;
  const achievementsUnlocked = { ...res.state.achievementsUnlocked };
  const ledger = [...res.state.ledger];
  const effects = [...res.effects];
  for (const a of fresh) {
    achievementsUnlocked[a.id] = ctx.now;
    if (a.rewardPoints > 0)
      ledger.push(pointsEvent(ctx, ctx.today, a.rewardPoints, 'achievement', `ach:${a.id}`, `Logro: ${a.title}`));
    effects.push({ type: 'achievement', id: a.id, title: a.title, emoji: a.emoji });
  }
  return { state: { ...res.state, achievementsUnlocked, ledger }, effects };
}
