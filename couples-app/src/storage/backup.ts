import type { AppState } from '../models/types';
import { migrate, SCHEMA_VERSION } from '../store/initialState';
import { media } from './media';

/**
 * Respaldo completo (Export / Import JSON) para pasar la app a otro teléfono.
 * Incluye el estado y las imágenes. Separado de la UI para poder reutilizarlo
 * después en una sincronización.
 */

export const BACKUP_FORMAT = 'nosotros-backup';

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  state: AppState;
  media: Record<string, string>;
}

export async function createBackup(state: AppState): Promise<BackupFile> {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    state,
    media: await media.all().catch(() => ({})),
  };
}

export function backupFileName(date = new Date()) {
  return `nosotros-respaldo-${date.toISOString().slice(0, 10)}.json`;
}

/** Valida y convierte un respaldo (de cualquier versión) al esquema actual. */
export function parseBackup(json: string): { state: AppState; media: Record<string, string> } {
  const data = JSON.parse(json);
  // Compatibilidad: los respaldos de la fase 1 eran el estado directamente.
  if (data?.format !== BACKUP_FORMAT) {
    if (!data || typeof data !== 'object' || !('hearts' in data)) throw new Error('Formato no reconocido');
    return { state: migrate(data), media: {} };
  }
  return { state: migrate(data.state), media: data.media ?? {} };
}

/** Restaura imágenes; el estado lo aplica quien llama (dispatch(replaceState)). */
export async function restoreMedia(items: Record<string, string>) {
  for (const [id, dataUrl] of Object.entries(items)) await media.put(dataUrl, id);
}
