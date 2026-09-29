import { setDateFilters } from '../features/dates/actions';
import type { DateFilters } from '../models/types';
import { dispatch, store, useAppState } from './store';

/**
 * Filtros de Date Night. Viven en el estado persistido (se recuerdan al
 * cerrar la app); este módulo solo da una API cómoda a la UI.
 */

export function getFilters(): DateFilters {
  return store.getState().dates.filters;
}

export function setFilters(next: DateFilters) {
  dispatch(setDateFilters(next));
}

export function toggleFilter<K extends keyof DateFilters>(key: K, value: DateFilters[K][number]) {
  const filters = getFilters();
  const list = filters[key] as string[];
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  setFilters({ ...filters, [key]: next });
}

export function useFilters(): DateFilters {
  return useAppState().dates.filters;
}
