/** Modelo de la biblioteca de citas (tipos del estado global). */
export type {
  Budget,
  DateCategory,
  DateFilters,
  DateIdea,
  DateLog,
  DateSnapshot,
  Duration,
  Energy,
  Level,
  Location,
  Mood,
  RandomIngredient,
  RecentPick,
} from '../../models/types';

import type { DateIdea } from '../../models/types';

/** Campos que la pareja llena en el editor. */
export type DateInput = Omit<DateIdea, 'id' | 'createdAt' | 'updatedAt' | 'dynamics' | 'ingredients'>;
