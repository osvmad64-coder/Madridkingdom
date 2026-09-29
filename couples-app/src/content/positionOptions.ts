/** Categorías de posiciones (etiquetas editables aquí sin tocar componentes). */
export const POSITION_CATEGORIES = [
  { id: 'intimate', label: 'Íntima', emoji: '🤍' },
  { id: 'romantic', label: 'Romántica', emoji: '💕' },
  { id: 'playful', label: 'Juguetona', emoji: '😏' },
  { id: 'daring', label: 'Atrevida', emoji: '🔥' },
  { id: 'relaxed', label: 'Relajada', emoji: '🌙' },
] as const;

export function positionCategory(id: string) {
  return POSITION_CATEGORIES.find((c) => c.id === id) ?? { id, label: id, emoji: '💋' };
}
