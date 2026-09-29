import type { AppState, DateCategory, RandomIngredient } from '../models/types';
import { CATEGORIES, RANDOM_INGREDIENTS } from '../content/dateOptions';

/** Estado inicial y migraciones del esquema guardado. */

export const SCHEMA_VERSION = 1;

export function createInitialState(now = Date.now()): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    profile: {
      partners: [
        { id: 'p1', name: 'Tú', avatar: '🌸' },
        { id: 'p2', name: 'Mi amor', avatar: '🌙' },
      ],
      message: '',
    },
    hearts: [],
    dayNotes: {},
    ledger: [],
    challengeSchedule: {},
    customChallenges: [],
    achievementsUnlocked: {},
    dates: { favorites: [], logs: [], recent: [] },
    settings: {
      enabledCategories: CATEGORIES.map((c) => c.id as DateCategory),
      randomIngredients: Object.fromEntries(
        RANDOM_INGREDIENTS.map((i) => [i.id, true]),
      ) as Record<RandomIngredient, boolean>,
      enabledChallengePacks: ['base', 'custom'],
      haptics: true,
    },
  };
}

/**
 * Convierte datos guardados de versiones anteriores al esquema actual.
 * Completa campos faltantes con los valores por defecto.
 */
export function migrate(raw: unknown): AppState {
  const base = createInitialState();
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Partial<AppState>;
  return {
    ...base,
    ...s,
    schemaVersion: SCHEMA_VERSION,
    profile: { ...base.profile, ...s.profile },
    dates: { ...base.dates, ...s.dates },
    settings: {
      ...base.settings,
      ...s.settings,
      randomIngredients: { ...base.settings.randomIngredients, ...s.settings?.randomIngredients },
    },
  };
}
