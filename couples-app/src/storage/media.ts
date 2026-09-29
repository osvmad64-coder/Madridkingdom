import { uid } from '../domain/random';

/**
 * Almacén de medios (imágenes de posiciones y citas).
 * Forma parte de la capa de persistencia: el estado va en StorageAdapter
 * (localStorage, pequeño y rápido) y las imágenes aquí (IndexedDB, que
 * soporta muchos MB). Ambos se exportan juntos en el respaldo.
 */
export interface MediaStore {
  put(dataUrl: string, id?: string): Promise<string>;
  get(id: string): Promise<string | null>;
  remove(id: string): Promise<void>;
  all(): Promise<Record<string, string>>;
}

const DB = 'nosotros-media';
const STORE = 'media';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class IndexedDbMediaStore implements MediaStore {
  private db: Promise<IDBDatabase> | null = null;
  private conn() {
    this.db ??= openDb();
    return this.db;
  }
  private async tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.conn();
    return new Promise((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async put(dataUrl: string, id = uid('m_')) {
    await this.tx('readwrite', (s) => s.put(dataUrl, id));
    return id;
  }
  async get(id: string) {
    return ((await this.tx('readonly', (s) => s.get(id))) as string | undefined) ?? null;
  }
  async remove(id: string) {
    await this.tx('readwrite', (s) => s.delete(id));
  }
  async all() {
    const keys = (await this.tx('readonly', (s) => s.getAllKeys())) as string[];
    const values = (await this.tx('readonly', (s) => s.getAll())) as string[];
    return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
  }
}

export class MemoryMediaStore implements MediaStore {
  private data = new Map<string, string>();
  async put(dataUrl: string, id = uid('m_')) {
    this.data.set(id, dataUrl);
    return id;
  }
  async get(id: string) {
    return this.data.get(id) ?? null;
  }
  async remove(id: string) {
    this.data.delete(id);
  }
  async all() {
    return Object.fromEntries(this.data);
  }
}

function createMediaStore(): MediaStore {
  try {
    if (typeof indexedDB !== 'undefined') return new IndexedDbMediaStore();
  } catch {
    /* sin IndexedDB */
  }
  return new MemoryMediaStore();
}

export const media: MediaStore = createMediaStore();
