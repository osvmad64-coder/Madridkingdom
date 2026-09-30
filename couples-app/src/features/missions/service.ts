import { gameConfig } from '../../config/game';
import { hashString, seededRng, shuffle, type Rng } from '../../domain/random';
import { daysInMonth, monthDays, startOfWeek, toDayKey, weekdayIndex } from '../../domain/time';
import type { AppState, ChallengeAssignment, DateLog, DayKey, MonthKey } from '../../models/types';
import { MISSION_LIBRARY, findMissionDef, type MissionDef } from './library';
import type { MissionArea, MissionMonth, MonthlyMission } from './model';

/**
 * Servicio de misiones (lógica pura).
 * - El progreso se calcula SIEMPRE de los datos reales del mes (corazones,
 *   retos, citas, notas, cartas, fechas). Nadie lo captura a mano.
 * - La generación es determinista por mes y se guarda una sola vez.
 */

/** Todo lo que las misiones necesitan saber de un mes. */
export interface MonthData {
  month: MonthKey;
  from: DayKey;
  to: DayKey;
  heartDays: DayKey[];
  challengeDays: DayKey[];
  challengeWeeks: number;
  challengesDone: ChallengeAssignment[];
  challengesOnDay: number;
  datesDone: DateLog[];
  newDatesDone: number;
  activeDays: number;
  partsUsed: string[];
  weekendCount: number;
  libraryCategories: string[];
}

export function monthRange(month: MonthKey) {
  return { from: `${month}-01`, to: `${month}-${String(daysInMonth(month)).padStart(2, '0')}` };
}

export function buildMonthData(s: AppState, month: MonthKey): MonthData {
  const { from, to } = monthRange(month);
  const inMonth = (d?: DayKey) => !!d && d >= from && d <= to;
  const dayOf = (t?: number) => (t ? toDayKey(new Date(t)) : undefined);

  const heartDays = [...new Set(s.hearts.map((h) => h.day).filter(inMonth))].sort();
  const schedule = s.challengeSchedule[month] ?? {};
  const challengeDays = Object.keys(schedule).sort();
  const challengesDone = Object.values(schedule).filter((a) => a.status === 'completed');
  const challengesOnDay = challengesDone.filter((a) => dayOf(a.completedAt) === a.day).length;

  const allDone = s.dates.logs.filter((l) => l.status === 'done' && l.doneDay);
  const datesDone = allDone.filter((l) => inMonth(l.doneDay));
  const newDatesDone = datesDone.filter(
    (l) => !allDone.some((o) => o.ideaId === l.ideaId && o.doneDay! < l.doneDay! ),
  ).length;

  const positionsDone = Object.values(s.positionSchedule[month]?.days ?? {}).filter((a) => a.status === 'completed');
  const noteDays = Object.keys(s.dayNotes).filter(inMonth);
  const letters = s.futureLetters.filter((l) => inMonth(dayOf(l.createdAt)));
  const moments = s.importantDates.filter((m) => inMonth(dayOf(m.createdAt)));

  const active = new Set<DayKey>([
    ...heartDays,
    ...noteDays,
    ...s.ledger.map((e) => e.day).filter(inMonth),
  ]);
  const parts = [
    heartDays.length && 'corazones',
    challengesDone.length && 'retos',
    positionsDone.length && 'posiciones',
    datesDone.length && 'citas',
    noteDays.length && 'notas',
    letters.length && 'cartas',
    moments.length && 'fechas',
  ].filter(Boolean) as string[];

  const days = monthDays(month);
  return {
    month,
    from,
    to,
    heartDays,
    challengeDays,
    challengeWeeks: new Set(challengeDays.map(startOfWeek)).size,
    challengesDone,
    challengesOnDay,
    datesDone,
    newDatesDone,
    activeDays: active.size,
    partsUsed: parts,
    weekendCount: new Set(days.filter((d) => weekdayIndex(d) >= 5).map(startOfWeek)).size,
    libraryCategories: [...new Set(s.dateIdeas.map((i) => i.category))].filter((c) =>
      s.settings.enabledCategories.includes(c),
    ),
  };
}

/* ───────────── Progreso ───────────── */

export interface MissionProgress {
  value: number;
  target: number;
  ratio: number;
  done: boolean;
}

export function missionProgress(m: MonthlyMission, data: MonthData): MissionProgress {
  const def = findMissionDef(m.defId);
  const target = m.params.target;
  const raw = def ? def.progress(data, m.params) : 0;
  const value = Math.min(raw, target);
  return { value, target, ratio: target ? value / target : 0, done: value >= target };
}

export function monthSummary(s: AppState, month: MonthKey) {
  const mm = s.monthlyMissions[month];
  if (!mm) return null;
  const data = buildMonthData(s, month);
  const items = mm.missions.map((m) => ({ mission: m, progress: missionProgress(m, data), def: findMissionDef(m.defId) }));
  const done = items.filter((i) => i.progress.done).length;
  return {
    month: mm,
    items,
    done,
    total: items.length,
    allDone: items.length > 0 && done === items.length,
    bonusAvailable: items.length > 0 && done === items.length && !mm.bonusClaimedAt,
  };
}

/** Meses anteriores con misiones, del más reciente al más antiguo. */
export function missionHistory(s: AppState, currentMonth: MonthKey) {
  return Object.keys(s.monthlyMissions)
    .filter((m) => m < currentMonth)
    .sort()
    .reverse();
}

/* ───────────── Generación ───────────── */

function weightedCount(rng: Rng): number {
  const opts = gameConfig.missions.countWeights;
  const total = opts.reduce((n, o) => n + o.weight, 0);
  let r = rng() * total;
  for (const o of opts) if ((r -= o.weight) < 0) return o.count;
  return opts[opts.length - 1].count;
}

/**
 * Genera las misiones de un mes: variedad de áreas (❤️ 🎯 💕 ❤️‍🔥), sin
 * repetir los tipos del mes anterior cuando se puede, objetivos variables y
 * realistas, y máximo una misión "especial".
 */
export function generateMissionMonth(s: AppState, month: MonthKey, now: number): MissionMonth {
  const rng = seededRng(hashString(`missions:${month}:${s.createdAt}`));
  const pick = <T,>(list: T[]): T => list[Math.floor(rng() * list.length)];
  const data = buildMonthData(s, month);
  const prevMonth = Object.keys(s.monthlyMissions).filter((m) => m < month).sort().pop();
  const lastUsed = new Set(prevMonth ? s.monthlyMissions[prevMonth].missions.map((m) => m.defId) : []);

  const count = weightedCount(rng);
  const areas = shuffle<MissionArea>(['hearts', 'challenges', 'dates', 'activity'], rng);
  const slots: (MissionArea | null)[] = [...areas.slice(0, Math.min(count, 4))];
  while (slots.length < count) slots.push(null); // área libre

  const feasibleVariants = (d: MissionDef) =>
    d.variants.filter((v) => !d.feasible || d.feasible(data, v.params));

  const chosen: MissionDef[] = [];
  for (const area of slots) {
    const pool = MISSION_LIBRARY.filter(
      (d) => (!area || d.area === area) && !chosen.includes(d) && feasibleVariants(d).length > 0,
    );
    const fresh = pool.filter((d) => !lastUsed.has(d.id));
    const def = (fresh.length ? fresh : pool).length ? pick(fresh.length ? fresh : pool) : undefined;
    if (def) chosen.push(def);
  }

  let specials = 0;
  const missions: MonthlyMission[] = chosen.map((def) => {
    let variants = feasibleVariants(def);
    if (specials >= gameConfig.missions.maxSpecialPerMonth) {
      const normal = variants.filter((x) => x.tier !== 'special');
      if (normal.length) variants = normal;
    }
    const variant = pick(variants);
    if (variant.tier === 'special') specials++;
    const params = { ...variant.params, ...(def.extra?.(data, pick) ?? {}) };
    return {
      id: `${month}:${def.id}`,
      defId: def.id,
      area: def.area,
      tier: variant.tier,
      points: gameConfig.missions.tierPoints[variant.tier],
      emoji: def.emoji,
      title: def.title(params),
      params,
    };
  });

  return { month, generatedAt: now, missions, bonusPoints: gameConfig.missions.monthBonus };
}

export const AREA_LABEL: Record<MissionArea, string> = {
  hearts: 'Corazones',
  challenges: 'Retos',
  dates: 'Citas',
  activity: 'Actividad',
};

export const TIER_LABEL = { easy: 'Fácil', medium: 'Media', hard: 'Difícil', special: 'Especial' } as const;
