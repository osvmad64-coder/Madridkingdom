import { gameConfig } from '../config/game';
import { CATEGORIES, RANDOM_INGREDIENTS } from '../content/dateOptions';
import { demoDateIdeas } from '../content/demo/dateIdeas';
import { hashString, seededRng } from '../domain/random';
import { LEGACY_CHALLENGES } from '../features/challenges/legacy';
import { seedChallenges } from '../features/challenges/seed';
import { challengePool, replaceAssignments } from '../features/challenges/service';
import { EMPTY_FILTERS, dateSnapshot } from '../features/dates/service';
import type {
  AppState,
  ChallengeAssignment,
  DateCategory,
  DateLog,
  MonthKey,
  RandomIngredient,
  RecentPick,
} from '../models/types';

/** Estado inicial y migraciones del esquema guardado. */

export const SCHEMA_VERSION = 2;

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
    challenges: seedChallenges(now),
    positions: [],
    positionSchedule: {},
    dateIdeas: [],
    achievementsUnlocked: {},
    dates: { favorites: [], logs: [], recent: [], filters: EMPTY_FILTERS },
    settings: {
      enabledCategories: CATEGORIES.map((c) => c.id as DateCategory),
      randomIngredients: Object.fromEntries(
        RANDOM_INGREDIENTS.map((i) => [i.id, true]),
      ) as Record<RandomIngredient, boolean>,
      challengeTypes: [],
      positionFrequency: gameConfig.positions.defaultFrequency,
      avoidRepeatDays: gameConfig.dateNight.defaultAvoidRepeatDays,
      haptics: true,
    },
  };
}

type Loose = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Fase 1 → Fase 2:
 * - Los retos genéricos se reemplazan por la biblioteca privada; los días
 *   completados conservan una copia y los pendientes reciben un reto nuevo.
 * - Las citas de demostración que ya se usaban (favoritas/historial) pasan a
 *   la biblioteca personal para no romper nada.
 */
function migrateV1(raw: Loose, base: AppState): AppState {
  const now = Date.now();
  const createdAt: number = raw.createdAt ?? now;
  const challenges = [
    ...seedChallenges(createdAt),
    ...((raw.customChallenges ?? []) as Loose[]).map((c) => ({
      ...c,
      active: true,
      source: 'user' as const,
      createdAt,
      updatedAt: createdAt,
    })),
  ] as AppState['challenges'];

  const schedule: AppState['challengeSchedule'] = {};
  for (const [month, days] of Object.entries((raw.challengeSchedule ?? {}) as Record<MonthKey, Loose>)) {
    schedule[month] = {};
    for (const [day, a] of Object.entries(days as Record<string, Loose>)) {
      const legacy = [...LEGACY_CHALLENGES, ...challenges].find((c) => c.id === a.challengeId);
      schedule[month][day] = {
        day,
        challengeId: a.challengeId,
        status: a.status,
        completedAt: a.completedAt,
        snapshot: {
          title: legacy?.title ?? 'Reto',
          description: legacy?.description ?? '',
          emoji: legacy?.emoji ?? '🎯',
          type: legacy?.type ?? 'romantic',
          points: legacy?.reward.points ?? 0,
        },
      } as ChallengeAssignment;
    }
  }

  const oldDates = (raw.dates ?? {}) as Loose;
  const usedIds = [...(oldDates.favorites ?? []), ...((oldDates.logs ?? []) as Loose[]).map((l) => l.ideaId)];
  const dateIdeas = demoDateIdeas(createdAt, usedIds);
  const logs = ((oldDates.logs ?? []) as DateLog[]).map((l) => {
    const idea = dateIdeas.find((i) => i.id === l.ideaId);
    return idea ? { ...l, snapshot: dateSnapshot(idea) } : l;
  });
  const recent: RecentPick[] = ((oldDates.recent ?? []) as unknown[]).map((r) =>
    typeof r === 'string' ? { id: r, at: 0 } : (r as RecentPick),
  );

  const { enabledChallengePacks: _drop, ...oldSettings } = (raw.settings ?? {}) as Loose;
  void _drop;
  const state: AppState = {
    ...base,
    ...(raw as Partial<AppState>),
    createdAt,
    schemaVersion: SCHEMA_VERSION,
    challenges,
    challengeSchedule: schedule,
    dateIdeas,
    dates: { ...base.dates, favorites: oldDates.favorites ?? [], logs, recent },
    settings: { ...base.settings, ...oldSettings } as AppState['settings'],
  };
  delete (state as Loose).customChallenges;

  // Días pendientes con retos que ya no existen → reto privado al azar (determinista).
  const ids = new Set(challenges.map((c) => c.id));
  state.challengeSchedule = replaceAssignments(
    state.challengeSchedule,
    challengePool(state),
    (a) => !ids.has(a.challengeId),
    seededRng(hashString(`migrate:${createdAt}`)),
  );
  return state;
}

/**
 * Convierte datos guardados de versiones anteriores al esquema actual.
 * Completa campos faltantes con los valores por defecto.
 */
export function migrate(raw: unknown): AppState {
  const base = createInitialState();
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Loose;
  const upgraded: AppState = (s.schemaVersion ?? 1) < 2 ? migrateV1(s, base) : (s as AppState);
  return {
    ...base,
    ...upgraded,
    schemaVersion: SCHEMA_VERSION,
    profile: { ...base.profile, ...upgraded.profile },
    dates: { ...base.dates, ...upgraded.dates, filters: { ...EMPTY_FILTERS, ...upgraded.dates?.filters } },
    settings: {
      ...base.settings,
      ...upgraded.settings,
      randomIngredients: { ...base.settings.randomIngredients, ...upgraded.settings?.randomIngredients },
    },
  };
}
