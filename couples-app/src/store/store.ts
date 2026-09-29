import { useSyncExternalStore } from 'react';
import type { AppState } from '../models/types';
import { LocalStorageAdapter, type StorageAdapter } from '../storage/adapter';
import { applyAchievements, makeCtx, type Action, type Effect } from './actions';
import { createInitialState, migrate } from './initialState';
import { media } from '../storage/media';
import { mediaInUse } from '../features/positions/service';

/**
 * Store central. Mantiene el estado, ejecuta acciones puras, avisa a la UI
 * de los efectos (animaciones) y persiste a través del StorageAdapter.
 * Para sincronizar entre teléfonos basta con otro StorageAdapter.
 */

const STATE_KEY = 'state';

type Listener = () => void;
type EffectListener = (effects: Effect[]) => void;

export class AppStore {
  private state: AppState = createInitialState();
  private listeners = new Set<Listener>();
  private effectListeners = new Set<EffectListener>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private storage: StorageAdapter) {}

  async init() {
    const saved = await this.storage.load<unknown>(STATE_KEY);
    this.state = saved ? migrate(saved) : createInitialState();
    // Guarda de inmediato si es nuevo o si se migró desde una versión anterior.
    if (!saved || (saved as { schemaVersion?: number }).schemaVersion !== this.state.schemaVersion)
      await this.storage.save(STATE_KEY, this.state);
    this.emit();
    void this.cleanupMedia();
  }

  getState = () => this.state;

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };

  onEffects = (l: EffectListener) => {
    this.effectListeners.add(l);
    return () => {
      this.effectListeners.delete(l);
    };
  };

  dispatch = (action: Action, now = Date.now()): Effect[] => {
    const ctx = makeCtx(now);
    const res = applyAchievements(action(this.state, ctx), ctx);
    if (res.state !== this.state) {
      this.state = res.state;
      this.emit();
      this.scheduleSave();
    }
    if (res.effects.length) this.effectListeners.forEach((l) => l(res.effects));
    return res.effects;
  };

  /** Guarda de inmediato (al cerrar/ocultar la app). */
  flush = () => {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    void this.storage.save(STATE_KEY, this.state);
  };

  /** Borra imágenes que ya no usa ningún elemento ni el historial. */
  private async cleanupMedia() {
    try {
      const used = mediaInUse(this.state);
      const all = await media.all();
      for (const id of Object.keys(all)) if (!used.has(id)) await media.remove(id);
    } catch {
      /* sin almacén de medios */
    }
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(this.flush, 250);
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }
}

export const store = new AppStore(new LocalStorageAdapter());

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', store.flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') store.flush();
  });
}

/** Hook principal: estado completo (usar selectores memorizados sobre él). */
export function useAppState(): AppState {
  return useSyncExternalStore(store.subscribe, store.getState);
}

export const dispatch = store.dispatch;
