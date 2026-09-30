import { useSyncExternalStore } from 'react';
import { todayKey } from '../domain/time';

/**
 * "Hoy" reactivo: detecta el cambio de día (y de mes) aunque la app quede
 * abierta, al volver del fondo o al reabrir la PWA. Sin recargar la página.
 */
let current = todayKey();
const listeners = new Set<() => void>();

function check() {
  const now = todayKey();
  if (now !== current) {
    current = now;
    listeners.forEach((l) => l());
  }
}

if (typeof window !== 'undefined') {
  setInterval(check, 30_000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
  window.addEventListener('focus', check);
  window.addEventListener('pageshow', check);
}

export function useToday(): string {
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
