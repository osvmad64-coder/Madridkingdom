import type { Achievement } from '../models/types';

/** Biblioteca de logros. Para agregar uno nuevo basta con añadirlo aquí. */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-heart',
    title: 'First Heart',
    description: 'Registren su primer ❤️',
    emoji: '❤️',
    metric: 'heartDays',
    target: 1,
    rewardPoints: 0,
  },
  {
    id: 'streak-7',
    title: '7 Day Streak',
    description: 'Una racha de 7 días',
    emoji: '🔥',
    metric: 'bestStreak',
    target: 7,
    rewardPoints: 0,
  },
  {
    id: 'streak-30',
    title: '30 Day Streak',
    description: 'Una racha de 30 días',
    emoji: '🔥',
    metric: 'bestStreak',
    target: 30,
    rewardPoints: 0,
  },
  {
    id: 'points-1000',
    title: '1,000 Points',
    description: 'Lleguen a 1,000 puntos',
    emoji: '⭐',
    metric: 'totalPoints',
    target: 1000,
    rewardPoints: 0,
  },
  {
    id: 'challenges-10',
    title: '10 Challenges',
    description: 'Completen 10 retos',
    emoji: '🎯',
    metric: 'challengesCompleted',
    target: 10,
    rewardPoints: 0,
  },
  {
    id: 'first-date',
    title: 'First Date Night',
    description: 'Completen su primera cita de la app',
    emoji: '💕',
    metric: 'datesDone',
    target: 1,
    rewardPoints: 0,
  },
];
