import { describe, expect, it } from 'vitest';
import { createInitialState, migrate } from '../store/initialState';
import {
  applyAchievements,
  completeChallenge,
  completeDate,
  completePosition,
  createChallenge,
  createDateIdea,
  createPosition,
  deleteChallenge,
  deleteDateIdea,
  deletePosition,
  ensureCalendarMonth,
  makeCtx,
  setChallengeActive,
  updateSettings,
  type Action,
} from '../store/actions';
import { allAssignments, challengePool, resolveChallenge } from '../features/challenges/service';
import { selectTotalPoints } from '../store/selectors';
import { EMPTY_FILTERS, filterIdeas, logView, pickIdea, randomPool } from '../features/dates/service';
import type { AppState, DateIdea } from '../models/types';

const at = (day: string) => new Date(`${day}T20:00:00`).getTime();
const run = (s: AppState, a: Action, day = '2026-09-10') => {
  const ctx = makeCtx(at(day));
  return applyAchievements(a(s, ctx), ctx).state;
};
const input = (title: string, points = 150) => ({
  title, description: '', text: `Texto de ${title}`, emoji: '🔥', type: 'romantic' as const,
  difficulty: 'medium' as const, tags: [], points, active: true,
});
const dateInput = (title: string, patch: Partial<DateIdea> = {}) => ({
  title, emoji: '💕', description: '', category: 'romantic' as const, tags: [], budget: 'low' as const,
  duration: 'hours' as const, location: ['home' as const], energy: 'medium' as const, mood: ['romantic' as const],
  spontaneity: 2 as const, difficulty: 1 as const, preparation: [], instructions: [], points: 150, ...patch,
});

describe('retos privados', () => {
  it('la biblioteca inicial son los retos privados de la pareja', () => {
    const s = createInitialState();
    expect(s.challenges.length).toBe(11);
    expect(s.challenges.some((c) => c.text === 'Bésame durante 5 minutos.')).toBe(true);
  });

  it('crear → sale en el calendario → completar da sus puntos', () => {
    let s = createInitialState(at('2026-09-01'));
    for (const c of s.challenges) s = run(s, setChallengeActive(c.id, false));
    s = run(s, createChallenge(input('Mi reto', 175)));
    s = run(s, ensureCalendarMonth('2026-10'));
    const days = Object.values(s.challengeSchedule['2026-10']);
    expect(days.length).toBeGreaterThan(0);
    expect(days.every((a) => a.snapshot.title === 'Mi reto')).toBe(true);
    const day = days[0].day;
    s = run(s, completeChallenge(day), day);
    expect(selectTotalPoints(s)).toBe(175);
  });

  it('eliminar reemplaza días pendientes y conserva el historial completado', () => {
    let s = run(createInitialState(at('2026-09-01')), ensureCalendarMonth('2026-09'));
    const [first, second] = Object.values(s.challengeSchedule['2026-09']).sort((a, b) => a.day.localeCompare(b.day));
    s = run(s, completeChallenge(first.day), first.day);
    const doneTitle = s.challengeSchedule['2026-09'][first.day].snapshot.title;
    s = run(s, deleteChallenge(first.challengeId));
    s = run(s, deleteChallenge(second.challengeId));
    const after = s.challengeSchedule['2026-09'];
    expect(Object.keys(after).length).toBe(Object.keys(s.challengeSchedule['2026-09']).length);
    expect(resolveChallenge(s, after[first.day]).title).toBe(doneTitle);
    expect(after[second.day].challengeId).not.toBe(second.challengeId);
    // Ningún día pendiente apunta a un reto borrado.
    const ids = new Set(s.challenges.map((c) => c.id));
    expect(allAssignments(s.challengeSchedule).filter((a) => a.status !== 'completed').every((a) => ids.has(a.challengeId))).toBe(true);
  });

  it('desactivar saca al reto de los sorteos', () => {
    let s = createInitialState();
    s = run(s, setChallengeActive(s.challenges[0].id, false));
    expect(challengePool(s).some((c) => c.id === s.challenges[0].id)).toBe(false);
  });
});

describe('posiciones', () => {
  it('solo en días con reto, según la frecuencia; completar da el bonus', () => {
    let s = createInitialState(at('2026-09-01'));
    s = run(s, updateSettings({ positionFrequency: 1 }));
    s = run(s, createPosition({ name: 'P1', description: '', category: 'intimate', difficulty: 'easy', points: 100, tags: [], active: true }));
    s = run(s, createPosition({ name: 'P2', description: '', category: 'intimate', difficulty: 'easy', points: 100, tags: [], active: true }));
    s = run(s, ensureCalendarMonth('2026-10'));
    const challengeDays = Object.keys(s.challengeSchedule['2026-10']).sort();
    const posDays = Object.keys(s.positionSchedule['2026-10'].days).sort();
    expect(posDays).toEqual(challengeDays);
    const d = posDays[0];
    s = run(s, completeChallenge(d), d);
    const before = selectTotalPoints(s);
    s = run(s, completePosition(d), d);
    expect(selectTotalPoints(s) - before).toBe(100);
  });

  it('frecuencia 0 → ninguna posición; borrar conserva completadas', () => {
    let s = createInitialState(at('2026-09-01'));
    s = run(s, updateSettings({ positionFrequency: 0 }));
    s = run(s, createPosition({ name: 'P1', description: '', category: 'intimate', difficulty: 'easy', points: 100, tags: [], active: true }));
    s = run(s, ensureCalendarMonth('2026-11'));
    expect(Object.keys(s.positionSchedule['2026-11']?.days ?? {}).length).toBe(0);

    let t = run(createInitialState(at('2026-09-01')), updateSettings({ positionFrequency: 1 }));
    t = run(t, createPosition({ name: 'Solo', description: '', category: 'intimate', difficulty: 'easy', points: 80, tags: [], active: true }));
    t = run(t, ensureCalendarMonth('2026-10'));
    const [d1, d2] = Object.keys(t.positionSchedule['2026-10'].days).sort();
    t = run(t, completePosition(d1), d1);
    t = run(t, deletePosition(t.positions[0].id));
    expect(t.positionSchedule['2026-10'].days[d1].snapshot.name).toBe('Solo');
    expect(t.positionSchedule['2026-10'].days[d2]).toBeUndefined();
  });
});

describe('biblioteca de citas', () => {
  it('filtros y Random solo usan citas de la biblioteca', () => {
    let s = createInitialState();
    expect(s.dateIdeas.length).toBe(0);
    s = run(s, createDateIdea(dateInput('Picnic sorpresa', { location: ['outdoors'], budget: 'low' })));
    s = run(s, createDateIdea(dateInput('Cena en casa', { location: ['home'], budget: 'low' })));
    s = run(s, createDateIdea(dateInput('Cena elegante', { location: ['restaurant'], budget: 'high' })));
    const f = { ...EMPTY_FILTERS, budget: ['low' as const], location: ['home' as const] };
    const res = filterIdeas(s.dateIdeas, { filters: f, settings: s.settings });
    expect(res.map((i) => i.title)).toEqual(['Cena en casa']);
    const pool = randomPool(filterIdeas(s.dateIdeas, { settings: s.settings }), s.settings.randomIngredients);
    for (let i = 0; i < 20; i++) expect(s.dateIdeas).toContain(pickIdea(pool, []));
    // No repite la última
    const last = s.dateIdeas[0].id;
    for (let i = 0; i < 20; i++) expect(pickIdea(pool, [last])?.id).not.toBe(last);
  });

  it('eliminar una cita realizada conserva el historial', () => {
    let s = run(createInitialState(), createDateIdea(dateInput('Picnic sorpresa')));
    const id = s.dateIdeas[0].id;
    s = run(s, completeDate(id));
    s = run(s, deleteDateIdea(id));
    expect(s.dateIdeas.length).toBe(0);
    expect(s.dates.logs.length).toBe(1);
    expect(logView(s.dates.logs[0], s.dateIdeas)?.title).toBe('Picnic sorpresa');
    expect(selectTotalPoints(s)).toBe(150);
  });
});

describe('migración fase 1 → fase 2', () => {
  it('conserva historial y reasigna retos pendientes', () => {
    const v1 = {
      schemaVersion: 1,
      createdAt: at('2026-08-01'),
      hearts: [{ id: 'h1', day: '2026-09-01', createdAt: 1 }],
      ledger: [{ id: 'l', day: '2026-09-01', createdAt: 1, amount: 100, source: 'heart', refId: 'h1', label: 'x' }],
      challengeSchedule: {
        '2026-09': {
          '2026-09-02': { day: '2026-09-02', challengeId: 'ch-love-note', status: 'completed', completedAt: 1 },
          '2026-09-20': { day: '2026-09-20', challengeId: 'ch-slow-dance', status: 'pending' },
        },
      },
      customChallenges: [],
      dates: { favorites: ['sunset-date'], logs: [{ id: 'd1', ideaId: 'cook-off', status: 'done', createdAt: 1, doneDay: '2026-09-01' }], recent: ['sunset-date'] },
      settings: { enabledChallengePacks: ['base'], haptics: false },
    };
    const s = migrate(v1);
    expect(s.schemaVersion).toBe(2);
    expect(s.challengeSchedule['2026-09']['2026-09-02'].snapshot.title).toBe('Notita escondida');
    expect(s.challenges.some((c) => c.id === s.challengeSchedule['2026-09']['2026-09-20'].challengeId)).toBe(true);
    expect(s.dateIdeas.map((d) => d.id).sort()).toEqual(['cook-off', 'sunset-date']);
    expect(s.dates.recent[0].id).toBe('sunset-date');
    expect(s.settings.haptics).toBe(false);
    expect(selectTotalPoints(s)).toBe(100);
  });
});
