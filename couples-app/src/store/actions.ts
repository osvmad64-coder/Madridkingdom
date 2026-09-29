import { gameConfig } from '../config/game';
import { ACHIEVEMENTS } from '../content/achievements';
import { newlyUnlocked } from '../domain/achievements';
import { heartReward } from '../domain/points';
import { uid } from '../domain/random';
import { computeRuns, crossedMilestones } from '../domain/streaks';
import type {
  AppState,
  CoupleProfile,
  DateCategory,
  DayKey,
  MonthKey,
  RandomIngredient,
  Settings,
} from '../models/types';
import { createInitialState } from './initialState';
import { chain, ok, pointsEvent, type Action, type Ctx, type Effect, type Result } from './core';
import { ensureChallengeMonth } from '../features/challenges/actions';
import { ensurePositionMonth } from '../features/positions/actions';
import { selectHeartDays, selectMetrics } from './selectors';

export * from './core';
export * from '../features/challenges/actions';
export * from '../features/positions/actions';
export * from '../features/dates/actions';

/* ───────────── Calendario ───────────── */

/**
 * Prepara un mes del calendario: primero los retos (misma distribución de
 * siempre) y después el sorteo de posiciones sobre esos días.
 * El calendario solo llama a esto; la lógica vive en cada módulo.
 */
export const ensureCalendarMonth = (month: MonthKey): Action =>
  chain(ensureChallengeMonth(month), ensurePositionMonth(month));

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
