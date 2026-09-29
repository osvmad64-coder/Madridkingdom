import { gameConfig } from '../../config/game';
import { pickOne, type Rng } from '../../domain/random';
import type { Settings } from '../../models/types';
import type {
  DateCategory,
  DateFilters,
  DateIdea,
  DateLog,
  DateSnapshot,
  RandomIngredient,
  RecentPick,
} from './model';

/**
 * Servicio de Date Night (lógica pura) sobre la BIBLIOTECA PERSONAL.
 * Nada aquí inventa citas: todo filtra/elige entre las que existen.
 */

export const EMPTY_FILTERS: DateFilters = { budget: [], location: [], duration: [], mood: [], energy: [] };

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

/**
 * Ingredientes de "Random personalizado", deducidos de los datos que la
 * pareja ya llenó (lugar, categoría, tags, espontaneidad): no hay que
 * capturar nada extra al crear una cita.
 */
export function ideaIngredients(i: DateIdea): RandomIngredient[] {
  const tags = i.tags.map((t) => t.toLowerCase());
  const has = (...words: string[]) => tags.some((t) => words.some((w) => t.includes(w)));
  const out = new Set<RandomIngredient>(i.ingredients ?? []);
  if (i.location.includes('home') || i.category === 'home') out.add('home');
  if (i.location.includes('cinema') || i.category === 'movie') out.add('cinema');
  if (i.location.includes('restaurant') || i.category === 'food') out.add('restaurant');
  if (has('café', 'cafe', 'coffee')) out.add('cafe');
  if (i.location.includes('outdoors') || i.category === 'outdoors') out.add('outdoors');
  if (i.location.includes('car') || has('road', 'viaje')) out.add('roadtrip');
  if (has('picnic')) out.add('picnic');
  if (i.category === 'creative') out.add('creative');
  if (i.spontaneity === 3 || i.category === 'special' || has('sorpresa')) out.add('unexpected');
  return [...out];
}

/**
 * Citas permitidas por "¿Qué puede incluir nuestro Random?".
 * Una cita se excluye solo si TODOS sus ingredientes están desactivados;
 * las que no encajan en ninguno siempre pueden salir.
 */
export function randomPool(ideas: DateIdea[], ingredients: Record<RandomIngredient, boolean>) {
  return ideas.filter((i) => {
    const ing = ideaIngredients(i);
    return !ing.length || ing.some((x) => ingredients[x]);
  });
}

/** Ids a evitar: la última elegida siempre, y las de los últimos X días si se configuró. */
export function recentToAvoid(recent: RecentPick[], avoidDays: number, now: number): string[] {
  const window = avoidDays > 0 ? recent.filter((r) => now - r.at < avoidDays * 86_400_000) : recent.slice(0, 1);
  return [...new Set([...recent.slice(0, 1), ...window].map((r) => r.id))];
}

/** Elige una cita evitando las recientes; si no queda otra, permite repetir (menos la actual). */
export function pickIdea(
  pool: DateIdea[],
  avoid: string[],
  opts: { exclude?: string; rng?: Rng } = {},
): DateIdea | undefined {
  const base = pool.filter((i) => i.id !== opts.exclude);
  const fresh = base.filter((i) => !avoid.includes(i.id));
  return pickOne(fresh.length ? fresh : base.length ? base : pool, opts.rng);
}

export function pushRecent(recent: RecentPick[], id: string, at: number): RecentPick[] {
  const max = gameConfig.dateNight.recentWindow;
  return [{ id, at }, ...recent.filter((r) => r.id !== id)].slice(0, Math.max(max, 1));
}

export function doneLogs(logs: DateLog[]) {
  return logs.filter((l) => l.status === 'done').sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
}

export function plannedLogs(logs: DateLog[]) {
  return logs
    .filter((l) => l.status === 'planned')
    .sort(
      (a, b) =>
        (a.plannedFor ?? '9999').localeCompare(b.plannedFor ?? '9999') || b.createdAt - a.createdAt,
    );
}

export function findIdea(ideas: DateIdea[], id: string) {
  return ideas.find((i) => i.id === id);
}

export function dateSnapshot(i: DateIdea): DateSnapshot {
  return {
    title: i.title,
    emoji: i.emoji,
    category: i.category,
    budget: i.budget,
    duration: i.duration,
    location: i.location,
    points: i.points,
  };
}

/** Datos para mostrar un registro del historial aunque la cita ya no exista. */
export function logView(log: DateLog, ideas: DateIdea[]) {
  const idea = findIdea(ideas, log.ideaId);
  const snap = idea ? dateSnapshot(idea) : log.snapshot;
  return snap ? { ...snap, deleted: !idea, idea } : null;
}
