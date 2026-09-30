import { diffDays, fromDayKey, toDayKey } from '../../domain/time';
import type { AppState, DayKey } from '../../models/types';
import type { ImportantDate } from './model';

/** Servicio de fechas importantes (lógica pura, siempre relativa a "hoy"). */

export interface Duration {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

/** Diferencia de calendario entre dos días (años, meses y días reales). */
export function durationBetween(from: DayKey, to: DayKey): Duration {
  const a = fromDayKey(from);
  const b = fromDayKey(to);
  let years = b.getFullYear() - a.getFullYear();
  let months = b.getMonth() - a.getMonth();
  let days = b.getDate() - a.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); // días del mes anterior
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days, totalDays: diffDays(from, to) };
}

export function durationLabel(d: Duration): string {
  const parts: string[] = [];
  if (d.years) parts.push(`${d.years} ${d.years === 1 ? 'año' : 'años'}`);
  if (d.months) parts.push(`${d.months} ${d.months === 1 ? 'mes' : 'meses'}`);
  if (d.days || !parts.length) parts.push(`${d.days} ${d.days === 1 ? 'día' : 'días'}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}` : parts[0];
}

/** Fecha en que empezó la relación: el momento "Empezamos" o el aniversario de Ajustes. */
export function relationshipStart(s: Pick<AppState, 'importantDates' | 'profile'>): DayKey | undefined {
  const starts = s.importantDates.filter((m) => m.kind === 'start').map((m) => m.date).sort();
  return starts[0] ?? s.profile.anniversary;
}

/** Día en que "cae" una fecha en un año dado (29 feb → 28 feb si no es bisiesto). */
function inYear(date: DayKey, year: number): DayKey {
  const d = fromDayKey(date);
  const last = new Date(year, d.getMonth() + 1, 0).getDate();
  return toDayKey(new Date(year, d.getMonth(), Math.min(d.getDate(), last)));
}

export interface Occurrence {
  moment?: ImportantDate;
  day: DayKey;
  daysLeft: number;
  /** Años que se cumplen ese día (solo fechas que se repiten). */
  years?: number;
}

/** Próxima vez que se celebra una fecha (hoy incluido). */
export function nextOccurrence(date: DayKey, recurring: boolean, today: DayKey): Occurrence | null {
  if (!recurring) return date >= today ? { day: date, daysLeft: diffDays(today, date) } : null;
  const y = Number(today.slice(0, 4));
  let day = inYear(date, y);
  if (day < today) day = inYear(date, y + 1);
  if (day < date) day = inYear(date, Number(date.slice(0, 4)));
  return { day, daysLeft: diffDays(today, day), years: Number(day.slice(0, 4)) - Number(date.slice(0, 4)) };
}

/** Próximo aniversario de la relación. */
export function nextAnniversary(s: Pick<AppState, 'importantDates' | 'profile'>, today: DayKey): Occurrence | null {
  const anniversaryMoments = s.importantDates.filter((m) => m.kind === 'anniversary');
  const start = relationshipStart(s);
  const base = start ?? anniversaryMoments[0]?.date;
  if (!base) return null;
  const occ = nextOccurrence(base, true, today);
  const moment = s.importantDates.find((m) => m.kind === 'start') ?? anniversaryMoments[0];
  return occ && { ...occ, moment };
}

/** Próximas fechas (todas), la más cercana primero. */
export function upcomingMoments(s: Pick<AppState, 'importantDates'>, today: DayKey): Occurrence[] {
  const list: Occurrence[] = [];
  for (const m of s.importantDates) {
    const o = nextOccurrence(m.date, m.recurring, today);
    if (o) list.push({ ...o, moment: m });
  }
  return list.sort((a, b) => a.daysLeft - b.daysLeft);
}

/** La historia de la relación en orden cronológico. */
export function timeline(s: Pick<AppState, 'importantDates'>): ImportantDate[] {
  return [...s.importantDates].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
}

export function countdownLabel(daysLeft: number): string {
  if (daysLeft === 0) return '¡Es hoy!';
  if (daysLeft === 1) return 'Mañana';
  return `Faltan ${daysLeft} días`;
}
