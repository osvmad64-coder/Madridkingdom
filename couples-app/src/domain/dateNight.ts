import type {
  DateCategory,
  DateFilters,
  DateIdea,
  DateLog,
  RandomIngredient,
  Settings,
} from '../models/types';
import { pickOne, type Rng } from './random';

/** Motor de Date Night: filtros, Random, favoritos e historial. */

export const EMPTY_FILTERS: DateFilters = {
  budget: [],
  location: [],
  duration: [],
  mood: [],
  energy: [],
};

export function activeFilterCount(f: DateFilters): number {
  return Object.values(f).reduce((n, list) => n + list.length, 0);
}

/** Un grupo vacío = sin restricción. Dentro de un grupo es "o"; entre grupos es "y". */
export function matchesFilters(idea: DateIdea, f: DateFilters): boolean {
  if (f.budget.length && !f.budget.includes(idea.budget)) return false;
  if (f.duration.length && !f.duration.includes(idea.duration)) return false;
  if (f.energy.length && !f.energy.includes(idea.energy)) return false;
  if (f.mood.length && !idea.mood.some((m) => f.mood.includes(m))) return false;
  if (
    f.location.length &&
    !f.location.includes('anywhere') &&
    !idea.location.includes('anywhere') &&
    !idea.location.some((l) => f.location.includes(l))
  )
    return false;
  return true;
}

export function filterIdeas(
  ideas: DateIdea[],
  opts: { filters?: DateFilters; category?: DateCategory | null; settings: Settings },
): DateIdea[] {
  return ideas.filter(
    (i) =>
      opts.settings.enabledCategories.includes(i.category) &&
      (!opts.category || i.category === opts.category) &&
      (!opts.filters || matchesFilters(i, opts.filters)),
  );
}

/** Ideas permitidas por la configuración de "¿Qué puede incluir nuestro Random?". */
export function randomPool(ideas: DateIdea[], ingredients: Record<RandomIngredient, boolean>) {
  return ideas.filter((i) => i.ingredients.some((ing) => ingredients[ing]));
}

/**
 * Elige una idea evitando las mostradas recientemente.
 * Si todas son recientes, vuelve a permitirlas.
 */
export function pickIdea(
  pool: DateIdea[],
  recent: string[],
  opts: { exclude?: string; rng?: Rng } = {},
): DateIdea | undefined {
  const base = pool.filter((i) => i.id !== opts.exclude);
  const fresh = base.filter((i) => !recent.includes(i.id));
  return pickOne(fresh.length ? fresh : base.length ? base : pool, opts.rng);
}

export function pushRecent(recent: string[], id: string, max = 5): string[] {
  return [id, ...recent.filter((r) => r !== id)].slice(0, max);
}

export function doneLogs(logs: DateLog[]) {
  return logs
    .filter((l) => l.status === 'done')
    .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
}

export function plannedLogs(logs: DateLog[]) {
  return logs
    .filter((l) => l.status === 'planned')
    .sort((a, b) => (a.plannedFor ?? '9999').localeCompare(b.plannedFor ?? '9999') || b.createdAt - a.createdAt);
}

export function findIdea(ideas: DateIdea[], id: string) {
  return ideas.find((i) => i.id === id);
}
