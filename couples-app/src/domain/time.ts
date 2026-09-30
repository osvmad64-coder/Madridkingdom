import type { DayKey, MonthKey } from '../models/types';

/** Utilidades de fechas locales (sin zonas horarias ni librerías). */

const pad = (n: number) => String(n).padStart(2, '0');

export function toDayKey(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDayKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(now: Date = new Date()): DayKey {
  return toDayKey(now);
}

export function monthKeyOf(day: DayKey): MonthKey {
  return day.slice(0, 7);
}

export function toMonthKey(year: number, month0: number): MonthKey {
  return `${year}-${pad(month0 + 1)}`;
}

export function addDays(day: DayKey, n: number): DayKey {
  const d = fromDayKey(day);
  d.setDate(d.getDate() + n);
  return toDayKey(d);
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return toMonthKey(d.getFullYear(), d.getMonth());
}

/** Diferencia en días (b - a). */
export function diffDays(a: DayKey, b: DayKey): number {
  const ms = fromDayKey(b).getTime() - fromDayKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function daysInMonth(month: MonthKey): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthDays(month: MonthKey): DayKey[] {
  const n = daysInMonth(month);
  return Array.from({ length: n }, (_, i) => `${month}-${pad(i + 1)}`);
}

/** Lunes de la semana del día dado (semana empieza en lunes). */
export function startOfWeek(day: DayKey): DayKey {
  const dow = (fromDayKey(day).getDay() + 6) % 7;
  return addDays(day, -dow);
}

export function weekDays(day: DayKey): DayKey[] {
  const start = startOfWeek(day);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Índice 0..6 empezando en lunes. */
export function weekdayIndex(day: DayKey): number {
  return (fromDayKey(day).getDay() + 6) % 7;
}

export const WEEKDAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
export const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function monthLabel(month: MonthKey): string {
  const [y, m] = month.split('-').map(Number);
  const name = MONTHS[m - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

export function dayLabel(day: DayKey): string {
  const d = fromDayKey(day);
  const label = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function shortDayLabel(day: DayKey): string {
  const d = fromDayKey(day);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "12 de marzo de 2026" */
export function longDayLabel(day: DayKey): string {
  const d = fromDayKey(day);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

/** "14 de febrero" */
export function dayMonthLabel(day: DayKey): string {
  const d = fromDayKey(day);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/** Nombre del mes en minúsculas: "septiembre". */
export function monthName(month: MonthKey): string {
  return MONTHS[Number(month.slice(5, 7)) - 1];
}
