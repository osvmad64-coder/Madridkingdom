import { useSyncExternalStore } from 'react';
import { EMPTY_FILTERS } from '../domain/dateNight';
import type { DateFilters } from '../models/types';

/**
 * Estado de UI de la sesión (no se guarda): filtros activos de Date Night.
 * Vive fuera de los componentes para compartirse entre pantallas.
 */

let filters: DateFilters = EMPTY_FILTERS;
const listeners = new Set<() => void>();

export function getFilters() {
  return filters;
}

export function setFilters(next: DateFilters) {
  filters = next;
  listeners.forEach((l) => l());
}

export function toggleFilter<K extends keyof DateFilters>(key: K, value: DateFilters[K][number]) {
  const list = filters[key] as string[];
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  setFilters({ ...filters, [key]: next });
}

export function useFilters(): DateFilters {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    getFilters,
  );
}
