import type { DayKey, ID } from '../../models/types';

/** ❤️ Fechas importantes de la relación. */
export type MomentKind = 'start' | 'first-kiss' | 'first-date' | 'birthday' | 'anniversary' | 'custom';

export interface ImportantDate {
  id: ID;
  kind: MomentKind;
  title: string;
  date: DayKey;
  emoji: string;
  note?: string;
  /** Se celebra cada año (cumpleaños, aniversarios…). */
  recurring: boolean;
  createdAt: number;
  updatedAt: number;
}
