import { store } from '../store/store';

/** Vibración ligera donde el navegador lo soporte (Android). En iOS es no-op. */
export function haptic(pattern: number | number[] = 8) {
  if (!store.getState().settings.haptics) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* no soportado */
  }
}
