import type {
  Budget,
  DateCategory,
  Duration,
  Energy,
  Location,
  Mood,
  RandomIngredient,
} from '../models/types';

/** Etiquetas, emojis y colores de todo lo relacionado con Date Night. */

export interface Option<T extends string> {
  id: T;
  label: string;
  emoji: string;
}

export interface CategoryOption extends Option<DateCategory> {
  /** Token de color del design system (ver tokens.css). */
  tone: 'rose' | 'butter' | 'lilac' | 'mint' | 'peach' | 'sky' | 'coral' | 'cream';
}

export const CATEGORIES: CategoryOption[] = [
  { id: 'romantic', label: 'Romántica', emoji: '💕', tone: 'rose' },
  { id: 'fun', label: 'Divertida', emoji: '😂', tone: 'butter' },
  { id: 'creative', label: 'Creativa', emoji: '🎨', tone: 'lilac' },
  { id: 'outdoors', label: 'Aire libre', emoji: '🌳', tone: 'mint' },
  { id: 'home', label: 'En casa', emoji: '🏠', tone: 'peach' },
  { id: 'food', label: 'Comida', emoji: '🍽️', tone: 'coral' },
  { id: 'adventure', label: 'Aventura', emoji: '🚗', tone: 'sky' },
  { id: 'movie', label: 'Película', emoji: '🎬', tone: 'lilac' },
  { id: 'cheap', label: 'Económica', emoji: '💰', tone: 'mint' },
  { id: 'special', label: 'Especial', emoji: '✨', tone: 'butter' },
];

export const BUDGETS: Option<Budget>[] = [
  { id: 'free', label: 'Gratis', emoji: '🪙' },
  { id: 'low', label: 'Bajo', emoji: '💵' },
  { id: 'moderate', label: 'Moderado', emoji: '💳' },
  { id: 'high', label: 'Alto', emoji: '💎' },
  { id: 'special', label: 'Especial', emoji: '✨' },
];

export const LOCATIONS: Option<Location>[] = [
  { id: 'home', label: 'Casa', emoji: '🏠' },
  { id: 'outdoors', label: 'Aire libre', emoji: '🌳' },
  { id: 'city', label: 'Ciudad', emoji: '🌆' },
  { id: 'restaurant', label: 'Restaurante', emoji: '🍽️' },
  { id: 'cinema', label: 'Cine', emoji: '🎬' },
  { id: 'car', label: 'Carro', emoji: '🚗' },
  { id: 'anywhere', label: 'Cualquier lugar', emoji: '📍' },
];

export const DURATIONS: Option<Duration>[] = [
  { id: 'quick', label: 'Rápida', emoji: '⚡' },
  { id: 'hours', label: '1–3 horas', emoji: '🕐' },
  { id: 'night', label: 'Toda la noche', emoji: '🌙' },
  { id: 'day', label: 'Todo el día', emoji: '☀️' },
];

export const MOODS: Option<Mood>[] = [
  { id: 'romantic', label: 'Romántico', emoji: '💕' },
  { id: 'fun', label: 'Divertido', emoji: '😂' },
  { id: 'random', label: 'Random', emoji: '🤪' },
  { id: 'creative', label: 'Creativo', emoji: '🎨' },
  { id: 'adventurous', label: 'Aventurero', emoji: '🔥' },
  { id: 'calm', label: 'Tranquilo', emoji: '🌙' },
  { id: 'conversation', label: 'Conversación', emoji: '🧠' },
  { id: 'competitive', label: 'Competitivo', emoji: '🎮' },
];

export const ENERGIES: Option<Energy>[] = [
  { id: 'low', label: 'Baja', emoji: '😴' },
  { id: 'medium', label: 'Media', emoji: '🙂' },
  { id: 'high', label: 'Alta', emoji: '🔥' },
];

export const RANDOM_INGREDIENTS: Option<RandomIngredient>[] = [
  { id: 'home', label: 'Casa', emoji: '🏠' },
  { id: 'cinema', label: 'Cine', emoji: '🎬' },
  { id: 'restaurant', label: 'Restaurante', emoji: '🍽️' },
  { id: 'cafe', label: 'Café', emoji: '☕' },
  { id: 'outdoors', label: 'Aire libre', emoji: '🌳' },
  { id: 'roadtrip', label: 'Road trip', emoji: '🚗' },
  { id: 'picnic', label: 'Picnic', emoji: '🧺' },
  { id: 'creative', label: 'Actividad creativa', emoji: '🎨' },
  { id: 'unexpected', label: 'Algo inesperado', emoji: '🎁' },
];

/** Frases que se muestran mientras "Sorpréndenos" piensa. */
export const SURPRISE_THINKING = [
  'Pensando…',
  '¿Casa?',
  '¿Salir?',
  '¿Algo romántico?',
  '¿Algo completamente random?',
];

export function labelOf<T extends string>(list: Option<T>[], id: T): Option<T> | undefined {
  return list.find((o) => o.id === id);
}
