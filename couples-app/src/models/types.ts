import type { Position, PositionMonth } from '../features/positions/model';
import type { ImportantDate } from '../features/moments/model';
import type { FutureLetter } from '../features/letters/model';
import type { MissionMonth } from '../features/missions/model';

export type { Position, PositionMonth, PositionAssignment, PositionSnapshot, PositionStatus } from '../features/positions/model';

/**
 * Modelos de datos de la app.
 * Todo lo que se guarda (AppState) y todo el contenido (retos, citas, logros)
 * está tipado aquí. La UI y la lógica solo dependen de estos tipos.
 */

/** Fecha local en formato 'YYYY-MM-DD'. */
export type DayKey = string;
/** Mes local en formato 'YYYY-MM'. */
export type MonthKey = string;
export type ID = string;

/* ───────────── Perfil / pareja ───────────── */

export interface Partner {
  id: ID;
  name: string;
  /** Emoji usado como avatar (preparado para foto en el futuro). */
  avatar: string;
  photoUrl?: string;
}

export interface CoupleProfile {
  partners: [Partner, Partner];
  /** Fecha en que empezaron (opcional, para aniversarios). */
  anniversary?: DayKey;
  /** Mensaje de pareja que aparece en Inicio. Vacío = mensaje del día. */
  message?: string;
}

/* ───────────── Our Intimacy ───────────── */

/** Un registro ❤️. Un día puede tener varios; la UI los agrupa. */
export interface HeartEntry {
  id: ID;
  day: DayKey;
  createdAt: number;
  authorId?: ID;
  note?: string;
}

/** Fuente de un movimiento de puntos. */
export type PointsSource = 'heart' | 'streak' | 'challenge' | 'position' | 'date' | 'mission' | 'achievement' | 'bonus';

/**
 * Libro de puntos: cada punto ganado es un evento con referencia a lo que lo generó.
 * Así se pueden deshacer acciones y calcular estadísticas por periodo.
 */
export interface PointsEvent {
  id: ID;
  day: DayKey;
  createdAt: number;
  amount: number;
  source: PointsSource;
  /** Id de lo que originó los puntos (entry, reto, cita…). */
  refId: string;
  label: string;
}

export type ChallengeType = 'bonus' | 'romantic' | 'experience' | 'surprise' | 'special';
export type Difficulty = 'easy' | 'medium' | 'hard';

/** Reto privado de pareja. La biblioteca vive en el estado y se edita desde la app. */
export interface Challenge {
  id: ID;
  title: string;
  /** Resumen corto que aparece en tarjetas. */
  description: string;
  /** Texto completo del reto (campo grande del editor). */
  text?: string;
  type: ChallengeType;
  reward: { points: number };
  difficulty: Difficulty;
  tags: string[];
  emoji: string;
  /** Solo los activos entran en los sorteos del calendario. */
  active: boolean;
  source: 'seed' | 'user';
  /** Fecha fija recurrente 'MM-DD' (reservado; no se edita desde la app). */
  fixedDate?: string;
  createdAt: number;
  updatedAt: number;
}

/** Copia del contenido de un reto en el momento en que se usó (historial). */
export interface ChallengeSnapshot {
  title: string;
  description: string;
  text?: string;
  emoji: string;
  type: ChallengeType;
  points: number;
}

export type ChallengeStatus = 'pending' | 'completed' | 'skipped';

/** Estado de un reto asignado a un día concreto. */
export interface ChallengeAssignment {
  day: DayKey;
  challengeId: ID;
  status: ChallengeStatus;
  completedAt?: number;
  /** Copia del reto: se congela al completarlo y se conserva si el reto se borra. */
  snapshot: ChallengeSnapshot;
}

/* ───────────── Logros ───────────── */

export type AchievementMetric =
  | 'heartDays'
  | 'bestStreak'
  | 'totalPoints'
  | 'challengesCompleted'
  | 'datesDone'
  | 'favorites';

export interface Achievement {
  id: ID;
  title: string;
  description: string;
  emoji: string;
  metric: AchievementMetric;
  target: number;
  /** Puntos extra al desbloquear (0 = ninguno). */
  rewardPoints: number;
}

/* ───────────── Date Night ───────────── */

export type Budget = 'free' | 'low' | 'moderate' | 'high' | 'special';
export type Location = 'home' | 'outdoors' | 'city' | 'restaurant' | 'cinema' | 'car' | 'anywhere';
export type Duration = 'quick' | 'hours' | 'night' | 'day';
export type Mood =
  | 'romantic'
  | 'fun'
  | 'random'
  | 'creative'
  | 'adventurous'
  | 'calm'
  | 'conversation'
  | 'competitive';
export type Energy = 'low' | 'medium' | 'high';
export type Level = 1 | 2 | 3;

export type DateCategory =
  | 'romantic'
  | 'fun'
  | 'creative'
  | 'outdoors'
  | 'home'
  | 'food'
  | 'adventure'
  | 'movie'
  | 'cheap'
  | 'special';

/** Ingredientes que el usuario puede permitir o no en "Sorpréndenos". */
export type RandomIngredient =
  | 'home'
  | 'cinema'
  | 'restaurant'
  | 'cafe'
  | 'outdoors'
  | 'roadtrip'
  | 'picnic'
  | 'creative'
  | 'unexpected';

/** Tipos de dinámica: lo que convierte una actividad en una experiencia. */
export type DynamicKind =
  | 'challenge'
  | 'random-decision'
  | 'game'
  | 'twist'
  | 'rules'
  | 'surprise'
  | 'questions'
  | 'competition'
  | 'creativity';

/** Cita de la biblioteca personal (creada y editada desde la app). */
export interface DateIdea {
  id: ID;
  title: string;
  emoji: string;
  description: string;
  category: DateCategory;
  tags: string[];
  budget: Budget;
  duration: Duration;
  /** Lugares donde funciona. 'anywhere' = cualquiera. */
  location: Location[];
  energy: Energy;
  mood: Mood[];
  spontaneity: Level;
  difficulty: Level;
  /** Qué hay que preparar antes. */
  preparation: string[];
  /** Pasos de la dinámica. */
  instructions: string[];
  optionalTwist?: string;
  points: number;
  /** Imagen opcional guardada en el almacén de medios. */
  imageId?: ID;
  /** Legado de la fase 1 (opcionales). */
  dynamics?: DynamicKind[];
  ingredients?: RandomIngredient[];
  createdAt: number;
  updatedAt: number;
}

/** Copia mínima de una cita para conservar el historial si se elimina. */
export interface DateSnapshot {
  title: string;
  emoji: string;
  category: DateCategory;
  budget: Budget;
  duration: Duration;
  location: Location[];
  points: number;
}

export interface DateFilters {
  budget: Budget[];
  location: Location[];
  duration: Duration[];
  mood: Mood[];
  energy: Energy[];
}

export type DateLogStatus = 'planned' | 'done';

export interface DateLog {
  id: ID;
  ideaId: ID;
  status: DateLogStatus;
  createdAt: number;
  plannedFor?: DayKey;
  doneAt?: number;
  doneDay?: DayKey;
  note?: string;
  snapshot?: DateSnapshot;
}

/** Última vez que Sorpréndenos mostró una cita. */
export interface RecentPick {
  id: ID;
  at: number;
}

/* ───────────── Ajustes ───────────── */

export interface Settings {
  enabledCategories: DateCategory[];
  randomIngredients: Record<RandomIngredient, boolean>;
  /** Tipos de reto permitidos en los sorteos (vacío = todos). */
  challengeTypes: ChallengeType[];
  /** Probabilidad (0..1) de que un día con reto reciba también una posición. */
  positionFrequency: number;
  /** Evitar que Sorpréndenos repita una cita durante X días (0 = solo no repetir seguidas). */
  avoidRepeatDays: number;
  haptics: boolean;
}

/* ───────────── Estado persistido ───────────── */

export interface AppState {
  schemaVersion: number;
  createdAt: number;
  profile: CoupleProfile;
  hearts: HeartEntry[];
  dayNotes: Record<DayKey, string>;
  ledger: PointsEvent[];
  /** Calendario de retos generado por mes. */
  challengeSchedule: Record<MonthKey, Record<DayKey, ChallengeAssignment>>;
  /** Biblioteca de retos privados (editable desde la app). */
  challenges: Challenge[];
  /** Biblioteca de posiciones especiales. */
  positions: Position[];
  /** Posiciones asignadas a días con reto, por mes. */
  positionSchedule: Record<MonthKey, PositionMonth>;
  /** Biblioteca personal de citas. */
  dateIdeas: DateIdea[];
  achievementsUnlocked: Record<ID, number>;
  dates: {
    favorites: ID[];
    logs: DateLog[];
    /** Últimas ideas mostradas (para no repetir en Random). */
    recent: RecentPick[];
    /** Filtros elegidos en Date Night (se recuerdan). */
    filters: DateFilters;
  };
  settings: Settings;
  /** ❤️ Fechas importantes de la relación. */
  importantDates: ImportantDate[];
  /** 💌 Cartas para el futuro. */
  futureLetters: FutureLetter[];
  /**
   * 🎯 Misiones por mes. El mes actual son las activas; los anteriores son
   * el historial. El progreso se calcula de los datos reales (no se guarda);
   * lo que se guarda es qué se reclamó (claimedAt / bonusClaimedAt).
   */
  monthlyMissions: Record<MonthKey, MissionMonth>;
}
