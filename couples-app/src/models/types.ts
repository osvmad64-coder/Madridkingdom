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
export type PointsSource = 'heart' | 'streak' | 'challenge' | 'date' | 'achievement' | 'bonus';

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

export interface Challenge {
  id: ID;
  title: string;
  description: string;
  type: ChallengeType;
  reward: { points: number };
  difficulty: Difficulty;
  tags: string[];
  /** Fecha fija recurrente 'MM-DD' (ej. San Valentín). */
  fixedDate?: string;
  /** Contenido privado de la pareja (packs propios). */
  private?: boolean;
  /** Pack al que pertenece; permite activar/desactivar grupos de retos. */
  pack: string;
  emoji: string;
}

export type ChallengeStatus = 'pending' | 'completed' | 'skipped';

/** Estado de un reto asignado a un día concreto. */
export interface ChallengeAssignment {
  day: DayKey;
  challengeId: ID;
  status: ChallengeStatus;
  completedAt?: number;
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
  dynamics: DynamicKind[];
  /** Ingredientes de Random a los que pertenece. */
  ingredients: RandomIngredient[];
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
}

/* ───────────── Ajustes ───────────── */

export interface Settings {
  enabledCategories: DateCategory[];
  randomIngredients: Record<RandomIngredient, boolean>;
  /** Packs de retos activos (permite agregar packs privados después). */
  enabledChallengePacks: string[];
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
  /** Retos creados por la pareja (privados, editables). */
  customChallenges: Challenge[];
  achievementsUnlocked: Record<ID, number>;
  dates: {
    favorites: ID[];
    logs: DateLog[];
    /** Últimas ideas mostradas (para no repetir en Random). */
    recent: ID[];
  };
  settings: Settings;
}
