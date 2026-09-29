import { describe, expect, it } from 'vitest';
import { summarizeStreaks, crossedMilestones } from '../domain/streaks';
import { generateMonthSchedule } from '../domain/challenges';
import { BASE_CHALLENGES } from '../content/challenges';
import { DATE_LIBRARY } from '../content/dateIdeas';
import { EMPTY_FILTERS, filterIdeas, pickIdea, randomPool } from '../domain/dateNight';
import { createInitialState } from '../store/initialState';
import { applyAchievements, completeChallenge, ensureMonthSchedule, makeCtx, registerHeart, removeHeartsForDay, type Action } from '../store/actions';
import { selectStreaks, selectTotalPoints } from '../store/selectors';
import { gameConfig } from '../config/game';
import { buildDemoState } from '../store/demo';
import { computePeriodStats, bestPeriod } from '../domain/stats';
import { allAssignments } from '../domain/challenges';

const at = (day: string) => new Date(`${day}T20:00:00`).getTime();

describe('rachas', () => {
  it('calcula racha actual, récord y margen de ayer', () => {
    const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10', '2026-09-11'];
    expect(summarizeStreaks(days, '2026-09-11')).toMatchObject({ current: 2, best: 3, activeToday: true });
    expect(summarizeStreaks(days, '2026-09-12')).toMatchObject({ current: 2, activeToday: false });
    expect(summarizeStreaks(days, '2026-09-13').current).toBe(0);
  });
  it('detecta milestones cruzados', () => {
    expect(crossedMilestones(2, 3).map((m) => m.days)).toEqual([3]);
    expect(crossedMilestones(5, 15).map((m) => m.days)).toEqual([7, 14]);
  });
});

describe('retos', () => {
  it('nunca supera el porcentaje máximo del mes', () => {
    for (let seed = 1; seed < 50; seed++) {
      const s = generateMonthSchedule('2026-09', BASE_CHALLENGES, seed);
      expect(Object.keys(s).length).toBeLessThanOrEqual(Math.floor(30 * gameConfig.challenges.maxDaysRatio));
      expect(Object.keys(s).length).toBeGreaterThan(0);
    }
  });
  it('incluye fechas especiales fijas', () => {
    const s = generateMonthSchedule('2027-02', BASE_CHALLENGES, 7);
    expect(s['2027-02-14']?.challengeId).toBe('ch-valentine');
  });
});

describe('acciones', () => {
  const run = (s: ReturnType<typeof createInitialState>, a: Action, day: string) => {
    const ctx = makeCtx(at(day));
    return applyAchievements(a(s, ctx), ctx);
  };
  it('registrar ❤️ da puntos, racha, milestone y logro; quitar lo revierte', () => {
    let s = createInitialState();
    let r = run(s, registerHeart('2026-09-01'), '2026-09-01');
    expect(r.effects.map((e) => e.type)).toEqual(['heart', 'points', 'achievement']);
    s = r.state;
    s = run(s, registerHeart('2026-09-02'), '2026-09-02').state;
    r = run(s, registerHeart('2026-09-03'), '2026-09-03');
    expect(r.effects.some((e) => e.type === 'milestone')).toBe(true);
    s = r.state;
    expect(selectTotalPoints(s)).toBe(300 + 50);
    expect(selectStreaks(s, '2026-09-03').current).toBe(3);
    // segundo registro el mismo día: se guarda, sin puntos extra
    s = run(s, registerHeart('2026-09-03'), '2026-09-03').state;
    expect(s.hearts.length).toBe(4);
    expect(selectTotalPoints(s)).toBe(350);
    s = run(s, removeHeartsForDay('2026-09-03'), '2026-09-03').state;
    expect(selectTotalPoints(s)).toBe(200);
    expect(s.achievementsUnlocked['first-heart']).toBeDefined();
  });
  it('no permite registrar días futuros', () => {
    const s = createInitialState();
    expect(run(s, registerHeart('2026-09-05'), '2026-09-01').state).toBe(s);
  });
  it('completa un reto una sola vez', () => {
    let s = run(createInitialState(), ensureMonthSchedule('2026-09'), '2026-09-30').state;
    const day = Object.keys(s.challengeSchedule['2026-09'])[0];
    s = run(s, completeChallenge(day), '2026-09-30').state;
    const pts = selectTotalPoints(s);
    expect(pts).toBeGreaterThan(0);
    s = run(s, completeChallenge(day), '2026-09-30').state;
    expect(selectTotalPoints(s)).toBe(pts);
  });
});

describe('date night', () => {
  const settings = createInitialState().settings;
  it('filtra por varios grupos', () => {
    const res = filterIdeas(DATE_LIBRARY, { settings, filters: { ...EMPTY_FILTERS, budget: ['free'], location: ['home'] } });
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((i) => i.budget === 'free')).toBe(true);
  });
  it('random respeta ingredientes y evita repetidos', () => {
    const only = { ...settings.randomIngredients };
    for (const k of Object.keys(only) as (keyof typeof only)[]) only[k] = false;
    only.cinema = true;
    const pool = randomPool(DATE_LIBRARY, only);
    expect(pool.every((i) => i.ingredients.includes('cinema'))).toBe(true);
    const all = randomPool(DATE_LIBRARY, settings.randomIngredients);
    const recent = all.slice(1).map((i) => i.id);
    expect(pickIdea(all, recent)?.id).toBe(all[0].id);
  });
});

describe('demo + estadísticas', () => {
  it('genera un estado coherente', () => {
    const now = at('2026-09-29');
    const s = buildDemoState(now);
    expect(selectStreaks(s, '2026-09-29').current).toBeGreaterThanOrEqual(9);
    const input = { heartDays: new Set(s.hearts.map((h) => h.day)), ledger: s.ledger, assignments: allAssignments(s.challengeSchedule) };
    const w = computePeriodStats('week', '2026-09-29', input);
    expect(w.buckets).toHaveLength(7);
    expect(computePeriodStats('year', '2026-09-29', input).buckets).toHaveLength(12);
    expect(bestPeriod('month', input)).not.toBeNull();
  });
});
