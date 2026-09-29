import { store } from '../store/store';

/** Vibración ligera donde el navegador lo soporte (Android). En iOS es no-op. */
export function haptic(pattern: number | number[] = 8) {
  if (!store.getState().settings.haptics) return;
  // Los navegadores bloquean la vibración antes del primer toque del usuario.
  if ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive === false) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* no soportado */
  }
}
