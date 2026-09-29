import { gameConfig } from '../../config/game';
import type { Challenge } from './model';

/**
 * Contenido inicial de retos privados (proporcionado por la pareja).
 * Solo se usa para crear la biblioteca la primera vez; después todo se
 * edita desde Ajustes → Contenido privado → Mis retos.
 */
type SeedChallenge = Pick<Challenge, 'id' | 'title' | 'text' | 'emoji' | 'type' | 'difficulty' | 'tags'> & {
  points?: number;
};

const P = gameConfig.challenges.defaultPoints;

const SEED: SeedChallenge[] = [
  { id: 'pc-touch-only', title: 'Solo con el tacto', text: 'Trata de excitarme solamente mediante el tacto.', emoji: '🖐️', type: 'romantic', difficulty: 'medium', tags: ['tacto'] },
  { id: 'pc-kiss-5min', title: 'Beso de 5 minutos', text: 'Bésame durante 5 minutos.', emoji: '💋', type: 'romantic', difficulty: 'easy', tags: ['besos'], points: 100 },
  { id: 'pc-kiss-5ways', title: '5 formas de besar', text: 'Bésame de 5 formas diferentes.', emoji: '😘', type: 'romantic', difficulty: 'easy', tags: ['besos'], points: 100 },
  { id: 'pc-sensual-massage', title: 'Masaje sensual', text: 'Dame un masaje sensual de cuerpo completo por al menos 10 minutos.', emoji: '🫶', type: 'experience', difficulty: 'medium', tags: ['masaje'] },
  { id: 'pc-whisper', title: 'Susurro al oído', text: 'Susurra algo en mi oreja que creas que me va a excitar.', emoji: '🤫', type: 'romantic', difficulty: 'easy', tags: ['palabras'], points: 100 },
  { id: 'pc-blindfold', title: 'Con los ojos vendados', text: 'Ponte una venda y deja que yo te haga lo que me nazca.', emoji: '🙈', type: 'surprise', difficulty: 'hard', tags: ['venda', 'confianza'], points: 200 },
  { id: 'pc-kiss-legs', title: 'Besos en las piernas', text: 'Bésame las piernas durante cinco minutos.', emoji: '🦵', type: 'romantic', difficulty: 'medium', tags: ['besos'] },
  { id: 'pc-kiss-choose', title: 'Tú escoges dónde', text: 'Dame un beso con lengua donde yo escoja o prefiera.', emoji: '👅', type: 'romantic', difficulty: 'medium', tags: ['besos'] },
  { id: 'pc-hold-back-15', title: '15 minutos de resistencia', text: 'Bésame y tócame sensualmente tratando de no pasar a mayores por 15 minutos.', emoji: '⏳', type: 'experience', difficulty: 'hard', tags: ['resistencia'], points: 200 },
  { id: 'pc-resist-lips', title: 'Resiste mis labios', text: 'Déjame besarte los labios y tienes que resistirte sin hacer nada más.', emoji: '🔥', type: 'experience', difficulty: 'medium', tags: ['resistencia', 'besos'] },
  { id: 'pc-guide-hand', title: 'Guía mi mano', text: 'Lleva mi mano a la parte de tu cuerpo que más sensitiva es.', emoji: '✋', type: 'romantic', difficulty: 'medium', tags: ['tacto'] },
];

export function seedChallenges(now: number): Challenge[] {
  return SEED.map((c) => ({
    ...c,
    description: c.text ?? '',
    reward: { points: c.points ?? P },
    active: true,
    source: 'seed',
    createdAt: now,
    updatedAt: now,
  }));
}
