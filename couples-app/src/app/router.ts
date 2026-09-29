import { useSyncExternalStore } from 'react';

/**
 * Router mínimo basado en hash (#/citas/historial).
 * Funciona en hosting estático (Render), soporta el gesto "atrás" de iOS
 * y no requiere dependencias.
 */

export type TabId = 'home' | 'intimacy' | 'dates' | 'us' | 'settings';

export interface Route {
  path: string;
  segments: string[];
  query: URLSearchParams;
  tab: TabId;
}

const TAB_BY_SEGMENT: Record<string, TabId> = {
  '': 'home',
  intimidad: 'intimacy',
  citas: 'dates',
  nosotros: 'us',
  ajustes: 'settings',
};

export const TAB_PATH: Record<TabId, string> = {
  home: '/',
  intimacy: '/intimidad',
  dates: '/citas',
  us: '/nosotros',
  settings: '/ajustes',
};

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  const segments = path.split('/').filter(Boolean);
  return { path, segments, query: new URLSearchParams(qs), tab: TAB_BY_SEGMENT[segments[0] ?? ''] ?? 'home' };
}

let current = parse();
const listeners = new Set<() => void>();
window.addEventListener('hashchange', () => {
  current = parse();
  listeners.forEach((l) => l());
});

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => current,
  );
}

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  const hash = `#${path}`;
  if (opts.replace) {
    history.replaceState(null, '', hash);
    current = parse();
    listeners.forEach((l) => l());
  } else if (window.location.hash !== hash) {
    window.location.hash = path;
  }
}

/** Botón "atrás" de la app: siempre va a la pantalla padre (predecible). */
export function goUp(parent: string) {
  navigate(parent);
}
