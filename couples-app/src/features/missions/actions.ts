import { monthKeyOf } from '../../domain/time';
import { ok, pointsEvent, type Action } from '../../store/core';
import { buildMonthData, generateMissionMonth, missionProgress, monthSummary } from './service';

/** Acciones de misiones: generar el mes actual y reclamar puntos (una sola vez). */

/** Crea las misiones del mes actual si todavía no existen. Nunca las regenera. */
export const ensureMissionMonth: Action = (s, ctx) => {
  const month = monthKeyOf(ctx.today);
  if (s.monthlyMissions[month]) return ok(s);
  return ok({ ...s, monthlyMissions: { ...s.monthlyMissions, [month]: generateMissionMonth(s, month, ctx.now) } });
};

export const missionRef = (id: string) => `mission:${id}`;
export const monthBonusRef = (month: string) => `mission-bonus:${month}`;

export const claimMission =
  (month: string, missionId: string): Action =>
  (s, ctx) => {
    const mm = s.monthlyMissions[month];
    const m = mm?.missions.find((x) => x.id === missionId);
    // Una sola vez: ni si ya está marcada ni si ya existe su registro de puntos.
    if (!mm || !m || m.claimedAt || s.ledger.some((e) => e.refId === missionRef(m.id))) return ok(s);
    if (!missionProgress(m, buildMonthData(s, month)).done) return ok(s);
    const missions = mm.missions.map((x) => (x.id === m.id ? { ...x, claimedAt: ctx.now } : x));
    return ok(
      {
        ...s,
        monthlyMissions: { ...s.monthlyMissions, [month]: { ...mm, missions } },
        ledger: [...s.ledger, pointsEvent(ctx, ctx.today, m.points, 'mission', missionRef(m.id), `Misión: ${m.title} 🎯`)],
      },
      [
        { type: 'mission', title: m.title, points: m.points },
        { type: 'points', amount: m.points, label: '🎯' },
      ],
    );
  };

export const claimMonthBonus =
  (month: string): Action =>
  (s, ctx) => {
    const sum = monthSummary(s, month);
    if (!sum || !sum.bonusAvailable || s.ledger.some((e) => e.refId === monthBonusRef(month))) return ok(s);
    const mm = sum.month;
    return ok(
      {
        ...s,
        monthlyMissions: { ...s.monthlyMissions, [month]: { ...mm, bonusClaimedAt: ctx.now } },
        ledger: [
          ...s.ledger,
          pointsEvent(ctx, ctx.today, mm.bonusPoints, 'mission', monthBonusRef(month), '¡Completamos el mes! 🏆'),
        ],
      },
      [
        { type: 'month-complete', month, points: mm.bonusPoints },
        { type: 'points', amount: mm.bonusPoints, label: '🏆' },
      ],
    );
  };
