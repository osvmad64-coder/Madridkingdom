import { STREAK_COPY } from '../../content/messages';

/** Textos contextuales de Inicio (según hora y racha). */

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function streakLine(current: number, activeToday: boolean): string {
  if (!current) return STREAK_COPY.none;
  if (!activeToday) return `${STREAK_COPY.atRisk} (${current} 🔥)`;
  if (current >= 7) return `${STREAK_COPY.onFire} ${current} días seguidos`;
  return `${STREAK_COPY.alive} · ${current} ${current === 1 ? 'día' : 'días'}`;
}
