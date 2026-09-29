import { useEffect, useState } from 'react';
import { media } from '../storage/media';

/** Carga una imagen del almacén de medios (con caché en memoria). */
const cache = new Map<string, string>();

export function useMedia(id: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(id ? cache.get(id) ?? null : null);
  useEffect(() => {
    if (!id) return setUrl(null);
    if (cache.has(id)) return setUrl(cache.get(id)!);
    let alive = true;
    media.get(id).then(
      (v) => {
        if (v) cache.set(id, v);
        if (alive) setUrl(v);
      },
      () => alive && setUrl(null),
    );
    return () => {
      alive = false;
    };
  }, [id]);
  return url;
}

export function primeMedia(id: string, dataUrl: string) {
  cache.set(id, dataUrl);
}

/** Reduce una imagen elegida por el usuario y devuelve imagen + miniatura (JPEG). */
export async function processImage(file: File): Promise<{ full: string; thumb: string }> {
  const src = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Imagen no válida'));
    i.src = src;
  });
  const scale = (max: number, quality: number) => {
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  };
  return { full: scale(1200, 0.84), thumb: scale(320, 0.8) };
}
