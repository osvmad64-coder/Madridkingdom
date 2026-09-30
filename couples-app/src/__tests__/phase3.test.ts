import { describe, expect, it } from 'vitest';
import { createInitialState, migrate } from '../store/initialState';
import {
  applyAchievements,
  claimMission,
  claimMonthBonus,
  completeChallenge,
  completeDate,
  createDateIdea,
  createLetter,
  createMoment,
  ensureCurrentPeriod,
  makeCtx,
  openLetter,
  registerHeart,
  type Action,
} from '../store/actions';
import { durationBetween, durationLabel, nextAnniversary, nextOccurrence } from '../features/moments/service';
import { letterStatus } from '../features/letters/service';
import { MISSION_LIBRARY } from '../features/missions/library';
import { buildMonthData, generateMissionMonth, missionProgress, monthSummary } from '../features/missions/service';
import { selectTotalPoints } from '../store/selectors';
import type { AppState } from '../models/types';

const at = (day: string, h = 20) => new Date(`${day}T${String(h).padStart(2, '0')}:00:00`).getTime();
const run = (s: AppState, a: Action, day: string) => {
  const ctx = makeCtx(at(day));
  return applyAchievements(a(s, ctx), ctx).state;
};

describe('momentos', () => {
  it('años, meses y días reales', () => {
    const d = durationBetween('2025-03-12', '2026-09-30');
    expect([d.years, d.months, d.days]).toEqual([1, 6, 18]);
    expect(durationLabel(d)).toBe('1 año, 6 meses y 18 días');
    expect(durationLabel(durationBetween('2026-09-01', '2026-09-30'))).toBe('29 días');
  });
  it('próxima ocurrencia y aniversario (29 feb incluido)', () => {
    expect(nextOccurrence('2024-02-29', true, '2026-01-10')?.day).toBe('2026-02-28');
    expect(nextOccurrence('2025-10-05', true, '2026-09-30')).toMatchObject({ day: '2026-10-05', daysLeft: 5, years: 1 });
    expect(nextOccurrence('2025-09-30', true, '2026-09-30')?.daysLeft).toBe(0);
    let s = createInitialState();
    s = run(s, createMoment({ kind: 'start', title: 'Empezamos', date: '2025-10-05', emoji: '❤️', recurring: true }), '2026-09-30');
    expect(nextAnniversary(s, '2026-09-30')?.daysLeft).toBe(5);
  });
});

describe('cartas', () => {
  it('bloqueada hasta su fecha; no se puede abrir antes', () => {
    let s = createInitialState();
    s = run(s, createLetter({ title: 'T', message: 'Secreto', unlockOn: '2026-10-05' }), '2026-09-30');
    const l = s.futureLetters[0];
    expect(letterStatus(l, '2026-09-30')).toBe('locked');
    s = run(s, openLetter(l.id), '2026-09-30');
    expect(s.futureLetters[0].openedAt).toBeUndefined();
    expect(letterStatus(s.futureLetters[0], '2026-10-05')).toBe('ready');
    s = run(s, openLetter(l.id), '2026-10-05');
    expect(letterStatus(s.futureLetters[0], '2026-10-05')).toBe('opened');
  });
});

describe('misiones', () => {
  const base = () => {
    let s = createInitialState(at('2026-01-01'));
    s = run(s, createDateIdea({ title: 'Picnic', emoji: '🧺', description: '', category: 'romantic', tags: [], budget: 'low', duration: 'hours', location: ['outdoors'], energy: 'medium', mood: ['romantic'], spontaneity: 2, difficulty: 1, preparation: [], instructions: [], points: 150 }), '2026-01-01');
    return s;
  };

  it('12 tipos exactamente, en las 4 áreas', () => {
    expect(MISSION_LIBRARY.length).toBe(12);
    expect(new Set(MISSION_LIBRARY.map((d) => d.area))).toEqual(new Set(['hearts', 'challenges', 'dates', 'activity']));
  });

  it('se generan al abrir el mes, no cambian al reabrir, variadas y realistas', () => {
    let s = run(base(), ensureCurrentPeriod, '2026-09-10');
    const sep = s.monthlyMissions['2026-09'];
    expect(sep.missions.length).toBeGreaterThanOrEqual(3);
    expect(sep.missions.length).toBeLessThanOrEqual(5);
    expect(new Set(sep.missions.map((m) => m.area)).size).toBeGreaterThanOrEqual(Math.min(3, sep.missions.length));
    expect(sep.missions.filter((m) => m.tier === 'special').length).toBeLessThanOrEqual(1);
    const again = run(s, ensureCurrentPeriod, '2026-09-25');
    expect(again.monthlyMissions['2026-09']).toBe(sep);
  });

  it('valores variables y sin repetir la misma combinación en meses seguidos', () => {
    let s = base();
    const targets = new Map<string, Set<number>>();
    let prevIds = '';
    for (let i = 0; i < 24; i++) {
      const month = `${2026 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
      s = run(s, ensureCurrentPeriod, `${month}-02`);
      const ids = s.monthlyMissions[month].missions.map((m) => m.defId).sort().join();
      expect(ids).not.toBe(prevIds);
      prevIds = ids;
      for (const m of s.monthlyMissions[month].missions) {
        if (!targets.has(m.defId)) targets.set(m.defId, new Set());
        targets.get(m.defId)!.add(m.params.target);
      }
    }
    const varied = [...targets.entries()].filter(([, t]) => t.size > 1).length;
    expect(varied).toBeGreaterThanOrEqual(6);
    expect(targets.size).toBeGreaterThanOrEqual(10); // casi todos los tipos aparecen
  });

  it('progreso automático de corazones, retos y citas; cobro único; bonus único', () => {
    let s = run(base(), ensureCurrentPeriod, '2026-09-01');
    // Forzamos un mes conocido para probar cada área.
    const mm = generateMissionMonth(s, '2026-09', 0);
    const defs = ['hearts-days', 'challenges-done', 'dates-done'];
    mm.missions = defs.map((id) => ({ id: `2026-09:${id}`, defId: id, area: 'hearts', tier: 'easy', points: 100, emoji: '🎯', title: id, params: { target: 2 } }));
    s = { ...s, monthlyMissions: { '2026-09': mm } };

    s = run(s, registerHeart('2026-09-02'), '2026-09-02');
    s = run(s, registerHeart('2026-09-03'), '2026-09-03');
    const days = Object.keys(s.challengeSchedule['2026-09']).sort().slice(0, 2);
    for (const d of days) s = run(s, completeChallenge(d), d);
    s = run(s, completeDate(s.dateIdeas[0].id), '2026-09-05');
    s = run(s, completeDate(s.dateIdeas[0].id), '2026-09-06');

    const data = buildMonthData(s, '2026-09');
    for (const m of mm.missions) expect(missionProgress(m, data).done).toBe(true);
    expect(buildMonthData(s, '2026-09').heartDays.length).toBe(2);

    const before = selectTotalPoints(s);
    s = run(s, claimMission('2026-09', '2026-09:hearts-days'), '2026-09-07');
    s = run(s, claimMission('2026-09', '2026-09:hearts-days'), '2026-09-07');
    expect(selectTotalPoints(s) - before).toBe(100);
    expect(monthSummary(s, '2026-09')!.bonusAvailable).toBe(true);
    s = run(s, claimMonthBonus('2026-09'), '2026-09-07');
    const afterBonus = selectTotalPoints(s);
    s = run(s, claimMonthBonus('2026-09'), '2026-09-08');
    expect(selectTotalPoints(s)).toBe(afterBonus);
    expect(afterBonus - before).toBe(100 + 1000);
  });

  it('cambio de mes: nuevo conjunto, historial intacto, progreso desde cero', () => {
    let s = run(base(), ensureCurrentPeriod, '2026-09-30');
    s = run(s, registerHeart('2026-09-30'), '2026-09-30');
    const sep = s.monthlyMissions['2026-09'];
    s = run(s, ensureCurrentPeriod, '2026-10-01');
    expect(s.monthlyMissions['2026-09']).toBe(sep);
    expect(s.monthlyMissions['2026-10']).toBeDefined();
    expect(buildMonthData(s, '2026-10').heartDays.length).toBe(0);
  });

  it('la migración de fase 2 agrega los campos nuevos sin perder datos', () => {
    const v2 = { ...createInitialState(), schemaVersion: 2 } as Partial<AppState>;
    delete v2.importantDates;
    delete v2.futureLetters;
    delete v2.monthlyMissions;
    const s = migrate(v2);
    expect(s.schemaVersion).toBe(3);
    expect(s.importantDates).toEqual([]);
    expect(s.monthlyMissions).toEqual({});
    expect(s.challenges.length).toBe(11);
  });
});
