/**
 * Capa de persistencia.
 * La app solo habla con `StorageAdapter`. Hoy usamos localStorage; mañana se
 * puede cambiar por una API/sincronización implementando la misma interfaz.
 */
export interface StorageAdapter {
  load<T>(key: string): Promise<T | null>;
  save<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private prefix = 'nosotros:') {}

  async load<T>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async save<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (err) {
      console.warn('No se pudo guardar', err);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch {
      /* ignorado */
    }
  }
}

/** Almacenamiento en memoria (tests o navegadores sin localStorage). */
export class MemoryAdapter implements StorageAdapter {
  private data = new Map<string, string>();
  async load<T>(key: string) {
    const raw = this.data.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  async save<T>(key: string, value: T) {
    this.data.set(key, JSON.stringify(value));
  }
  async remove(key: string) {
    this.data.delete(key);
  }
}
