import type { MomentKind } from './model';

/** Tipos de fecha importante (etiquetas e íconos editables aquí). */
export const MOMENT_KINDS: { id: MomentKind; label: string; emoji: string; defaultTitle: string; recurring: boolean }[] = [
  { id: 'start', label: 'Empezamos', emoji: '❤️', defaultTitle: 'Empezamos nuestra relación', recurring: true },
  { id: 'first-kiss', label: 'Primer beso', emoji: '💋', defaultTitle: 'Primer beso', recurring: true },
  { id: 'first-date', label: 'Primera cita', emoji: '🌹', defaultTitle: 'Primera cita', recurring: true },
  { id: 'birthday', label: 'Cumpleaños', emoji: '🎂', defaultTitle: 'Cumpleaños', recurring: true },
  { id: 'anniversary', label: 'Aniversario', emoji: '💕', defaultTitle: 'Aniversario', recurring: true },
  { id: 'custom', label: 'Personalizada', emoji: '⭐', defaultTitle: '', recurring: false },
];

export const kindInfo = (id: MomentKind) => MOMENT_KINDS.find((k) => k.id === id) ?? MOMENT_KINDS[5];
