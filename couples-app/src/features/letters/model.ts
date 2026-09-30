import type { DayKey, ID } from '../../models/types';

/** 💌 Carta para el futuro. */
export interface FutureLetter {
  id: ID;
  title: string;
  message: string;
  /** Fecha desde la que se puede abrir. Sin fecha = se puede abrir ya. */
  unlockOn?: DayKey;
  /** Foto opcional (almacén de medios). */
  imageId?: ID;
  thumbId?: ID;
  /** Quién la escribe y para quién (preparado para sincronizar dos teléfonos). */
  fromId?: ID;
  toId?: ID;
  /** Día en que se escribió. */
  writtenOn: DayKey;
  /** Cuándo se abrió por primera vez (pasa al archivo). */
  openedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export type LetterStatus = 'locked' | 'ready' | 'opened';
