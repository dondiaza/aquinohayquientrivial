/**
 * FORMATOS DE PARTIDA — la estructura del juego es DATOS, no código de UI.
 *
 * Una partida es una lista de rondas; cada ronda declara cuántas preguntas pide, qué
 * tipos de prueba admite, cómo se presenta, qué modificadores aplica y con qué
 * probabilidad base el director puede disparar un suceso.
 *
 * Fase 2 añade familias de ronda (Radio Patio, telefonillo, memoria, qué falta, la junta,
 * la derrama, presidente por un día) y el contenido de ANHQV añade FICHA DEL VECINO, la
 * única ronda en la que se escribe la respuesta. Hay además dos "minijuegos" que en
 * realidad son formas de presentar rondas existentes:
 *
 *   · BUZONES  → las pistas de ¿QUIÉN ES? aparecen tras buzones que el jugador decide
 *                abrir. Cuantos menos abra, más puntos.
 *   · ASCENSOR → el progreso de la ronda se muestra como un ascensor que sube plantas
 *                y se para cuando fallas.
 *
 * Estimación de duración: ~25 s por pregunta de media.
 */

import type { ScoreModifier } from '../scoring/scoring';
import type { QuestionType } from '../questions/types';

export const SECONDS_PER_QUESTION_ESTIMATE = 25;

/** Cómo se presenta la ronda (identidad visual y mecánica de interacción). */
export type RoundPresentation = 'normal' | 'buzones' | 'telefonillo' | 'junta' | 'memoria';

/** Cómo se dibuja el progreso de la ronda. */
export type RoundProgressStyle = 'normal' | 'ascensor';

export type RoundDefinition = {
  id: string;
  title: string;
  subtitle: string;
  /** Frase de la cartela de inicio de ronda. */
  line: string;
  /** Regla de la ronda, en una línea, para la cartela. */
  rule?: string;
  questionCount: number;
  /** Tipos admitidos, en orden de preferencia. Vacío = cualquiera. */
  allowedTypes: readonly QuestionType[];
  /** Desplaza la dificultad objetivo de la ronda (±). */
  difficultyOffset?: number;
  /** Estira/encoge el tiempo de las preguntas de la ronda. */
  timeScale?: number;
  /** Modificadores fijos de puntuación de la ronda. */
  modifiers?: readonly ScoreModifier[];
  /** Probabilidad base (0..1) de que el director dispare un suceso en esta ronda. */
  eventChance: number;
  /** Ronda final con apuesta. */
  isFinal?: boolean;
  /** Ronda con apuesta previa (la derrama), aunque no sea la final. */
  hasWager?: boolean;
  presentation?: RoundPresentation;
  progressStyle?: RoundProgressStyle;
  /** Acento visual de la cartela. */
  accent?: 'verde' | 'granate' | 'morado' | 'mostaza' | 'azul' | 'naranja';
  icon?: string;
};

export type GameFormat = {
  id: string;
  label: string;
  tagline: string;
  /** Duración aproximada mostrada al jugador. */
  estimatedMinutes: string;
  rounds: readonly RoundDefinition[];
};

// ── Familias de ronda ────────────────────────────────────────────────────────

const ROUND_WARMUP = {
  id: 'calentando-la-junta',
  title: 'Calentando la junta',
  subtitle: 'Preguntas rápidas para romper el hielo',
  line: 'Todo el mundo ha llegado tarde menos tú. Empezamos suave.',
  rule: 'Preguntas directas. Sin trampas todavía.',
  allowedTypes: ['MULTIPLE_CHOICE', 'TRUE_FALSE'] as const,
  difficultyOffset: -0.5,
  eventChance: 0,
  accent: 'verde' as const,
  icon: '🚪',
} satisfies Omit<RoundDefinition, 'questionCount'>;

const ROUND_RADIO_PATIO = {
  id: 'radio-patio',
  title: 'Radio Patio',
  subtitle: 'Rumores, verdades a medias e infiltrados',
  line: 'Cinco rumores. Poco tiempo. No te fíes de nadie.',
  rule: 'Cadena de afirmaciones: encadena aciertos y el combo sube.',
  allowedTypes: ['TRUE_FALSE', 'IMPOSTOR'] as const,
  timeScale: 0.85,
  modifiers: [{ id: 'ronda-radio-patio', label: 'Radio Patio', multiplier: 1.15 }] as const,
  eventChance: 0.25,
  accent: 'granate' as const,
  icon: '📡',
} satisfies Omit<RoundDefinition, 'questionCount'>;

const ROUND_BUZONES = {
  id: 'quien-vive-aqui',
  title: '¿Quién vive aquí?',
  subtitle: 'Pistas escondidas en los buzones',
  line: 'Alguien ha dejado una nota sin firmar. Abre buzones si te hace falta.',
  rule: 'Cada buzón que abres es una pista… y menos puntos.',
  allowedTypes: ['WHO_IS_IT', 'MULTIPLE_CHOICE'] as const,
  eventChance: 0.2,
  presentation: 'buzones' as const,
  accent: 'azul' as const,
  icon: '📬',
} satisfies Omit<RoundDefinition, 'questionCount'>;

const ROUND_MEMORIA = {
  id: 'memoria-de-vecino',
  title: 'Memoria de vecino',
  subtitle: 'Lo que se ve en el rellano no se olvida',
  line: 'Mira bien. Luego te preguntan. Y el ascensor sube contigo.',
  rule: 'Memoriza mientras se ve; después responde de memoria.',
  allowedTypes: ['MEMORY_GRID', 'SEQUENCE'] as const,
  eventChance: 0.15,
  presentation: 'memoria' as const,
  progressStyle: 'ascensor' as const,
  accent: 'naranja' as const,
  icon: '🧠',
} satisfies Omit<RoundDefinition, 'questionCount'>;

const ROUND_QUE_FALTA = {
  id: 'que-falta-aqui',
  title: '¿Qué falta aquí?',
  subtitle: 'Composiciones del portal con un objeto ausente',
  line: 'El portal de siempre… pero hoy hay algo que no está.',
  rule: 'Mira la escena y señala lo que NO aparece.',
  allowedTypes: ['MISSING_ITEM', 'MEMORY_GRID'] as const,
  eventChance: 0.2,
  accent: 'azul' as const,
  icon: '🔍',
} satisfies Omit<RoundDefinition, 'questionCount'>;

const ROUND_LA_JUNTA = {
  id: 'la-junta',
  title: 'La junta',
  subtitle: 'Decisiones con consecuencias',
  line: 'Se abre la sesión. Tú presides. Que nadie salga corriendo.',
  rule: 'No hay respuesta absurda: hay decisiones mejores y peores.',
  allowedTypes: ['DECISION'] as const,
  timeScale: 1.2,
  modifiers: [{ id: 'ronda-junta', label: 'Junta', multiplier: 1.2 }] as const,
  eventChance: 0.1,
  presentation: 'junta' as const,
  accent: 'morado' as const,
  icon: '🗳️',
} satisfies Omit<RoundDefinition, 'questionCount'>;

const ROUND_TELEFONILLO = {
  id: 'llamada-al-telefonillo',
  title: 'Llamada al telefonillo',
  subtitle: 'Ultrarrápida y bien pagada',
  line: '¡Están llamando! Contesta ya, que no tenemos todo el día.',
  rule: 'Muy poco tiempo, muchos puntos. Sin pensarlo dos veces.',
  allowedTypes: ['TRUE_FALSE', 'MULTIPLE_CHOICE'] as const,
  timeScale: 0.45,
  modifiers: [{ id: 'ronda-telefonillo', label: 'Telefonillo', multiplier: 1.8 }] as const,
  eventChance: 0,
  presentation: 'telefonillo' as const,
  accent: 'naranja' as const,
  icon: '☎️',
} satisfies Omit<RoundDefinition, 'questionCount'>;

const ROUND_FICHA = {
  id: 'ficha-del-vecino',
  title: 'Ficha del vecino',
  subtitle: 'Aquí se escribe la respuesta',
  line: 'Se acabó elegir entre cuatro. Escribe tú el nombre.',
  rule: 'Sin opciones que copiar. Vale sin tildes y con una letra bailada.',
  allowedTypes: ['SHORT_ANSWER'] as const,
  timeScale: 1.15,
  modifiers: [{ id: 'ronda-ficha', label: 'Ficha', multiplier: 1.3 }] as const,
  eventChance: 0.1,
  accent: 'azul' as const,
  icon: '✍️',
} satisfies Omit<RoundDefinition, 'questionCount'>;

const ROUND_CHAOS = {
  id: 'caos-en-el-portal',
  title: 'Caos en el portal',
  subtitle: 'Con modificadores: más riesgo, más puntos',
  line: 'Se ha juntado la obra del 3º con la mudanza del 1º. Suerte.',
  rule: 'Todo vale más, todo cuesta más.',
  allowedTypes: ['ORDER_CHAOS', 'MULTIPLE_CHOICE', 'IMPOSTOR'] as const,
  difficultyOffset: 0.5,
  modifiers: [{ id: 'ronda-caos', label: 'Ronda de caos', multiplier: 1.25 }] as const,
  eventChance: 0.4,
  accent: 'mostaza' as const,
  icon: '🧯',
} satisfies Omit<RoundDefinition, 'questionCount'>;

const ROUND_ACTA = {
  id: 'lectura-del-acta',
  title: 'Lectura del acta',
  subtitle: 'Lo que quedó por escrito',
  line: 'El secretario leyó el acta de la última junta. ¿Te acuerdas?',
  rule: 'Memoria de lo ocurrido, con calma.',
  allowedTypes: ['MULTIPLE_CHOICE', 'ORDER_CHAOS', 'TRUE_FALSE'] as const,
  difficultyOffset: 0.5,
  eventChance: 0.3,
  accent: 'verde' as const,
  icon: '📜',
} satisfies Omit<RoundDefinition, 'questionCount'>;

const ROUND_LIGHTNING = {
  id: 'apagon-relampago',
  title: 'Apagón relámpago',
  subtitle: 'Menos tiempo, más puntos',
  line: 'Ha saltado el diferencial. Responde antes de que vuelva la luz.',
  rule: 'Contrarreloj de verdad.',
  allowedTypes: ['TRUE_FALSE', 'MULTIPLE_CHOICE'] as const,
  timeScale: 0.7,
  modifiers: [{ id: 'ronda-relampago', label: 'Relámpago', multiplier: 1.4 }] as const,
  eventChance: 0.15,
  progressStyle: 'ascensor' as const,
  accent: 'naranja' as const,
  icon: '⚡',
} satisfies Omit<RoundDefinition, 'questionCount'>;

const ROUND_DERRAMA = {
  id: 'la-derrama',
  title: 'La derrama',
  subtitle: 'Apuesta antes de saber de qué va',
  line: 'Hay que pagar algo. Decide cuánto te juegas.',
  rule: 'Apuestas primero; la pregunta llega después.',
  allowedTypes: ['FINAL_BET'] as const,
  difficultyOffset: 0.5,
  eventChance: 0,
  hasWager: true,
  accent: 'morado' as const,
  icon: '💸',
} satisfies Omit<RoundDefinition, 'questionCount'>;

const ROUND_PRESIDENTE = {
  id: 'presidente-por-un-dia',
  title: 'Presidente por un día',
  subtitle: 'Última pregunta, máximo riesgo',
  line: 'Última junta del día. Aquí se decide quién manda en el portal.',
  rule: 'Apuesta lo que quieras: se acaba aquí.',
  allowedTypes: ['FINAL_BET'] as const,
  difficultyOffset: 1.5,
  modifiers: [{ id: 'ronda-presidente', label: 'Presidencia', multiplier: 1.5 }] as const,
  eventChance: 0,
  isFinal: true,
  hasWager: true,
  accent: 'granate' as const,
  icon: '🏛️',
} satisfies Omit<RoundDefinition, 'questionCount'>;

// ── Formatos ─────────────────────────────────────────────────────────────────

export const GAME_FORMATS = [
  {
    id: 'express',
    label: 'Express',
    tagline: 'Una junta que por una vez es corta',
    estimatedMinutes: '~5 min',
    rounds: [
      { ...ROUND_WARMUP, questionCount: 4 },
      { ...ROUND_RADIO_PATIO, questionCount: 4 },
      { ...ROUND_TELEFONILLO, questionCount: 2 },
      { ...ROUND_PRESIDENTE, questionCount: 1 },
    ],
  },
  {
    id: 'normal',
    label: 'Normal',
    tagline: 'La junta de siempre, con todas sus sorpresas',
    estimatedMinutes: '~12-15 min',
    rounds: [
      { ...ROUND_WARMUP, questionCount: 6 },
      { ...ROUND_RADIO_PATIO, questionCount: 6 },
      { ...ROUND_BUZONES, questionCount: 5 },
      { ...ROUND_FICHA, questionCount: 4 },
      { ...ROUND_MEMORIA, questionCount: 4 },
      { ...ROUND_CHAOS, questionCount: 5 },
      { ...ROUND_TELEFONILLO, questionCount: 2 },
      { ...ROUND_PRESIDENTE, questionCount: 1 },
    ],
  },
  {
    id: 'maraton',
    label: 'Maratón',
    tagline: 'Junta extraordinaria: aquí no sale nadie',
    estimatedMinutes: '~20-25 min',
    rounds: [
      { ...ROUND_WARMUP, questionCount: 7 },
      { ...ROUND_RADIO_PATIO, questionCount: 7 },
      { ...ROUND_BUZONES, questionCount: 5 },
      { ...ROUND_FICHA, questionCount: 5 },
      { ...ROUND_MEMORIA, questionCount: 5 },
      { ...ROUND_QUE_FALTA, questionCount: 4 },
      { ...ROUND_LA_JUNTA, questionCount: 3 },
      { ...ROUND_CHAOS, questionCount: 5 },
      { ...ROUND_ACTA, questionCount: 4 },
      { ...ROUND_LIGHTNING, questionCount: 4 },
      { ...ROUND_DERRAMA, questionCount: 1 },
      { ...ROUND_PRESIDENTE, questionCount: 1 },
    ],
  },
] as const satisfies readonly GameFormat[];

export type GameFormatId = (typeof GAME_FORMATS)[number]['id'];

export const GAME_FORMAT_IDS = GAME_FORMATS.map((format) => format.id) as [
  GameFormatId,
  ...GameFormatId[],
];

export const DEFAULT_FORMAT: GameFormatId = 'normal';

/** Catálogo de familias de ronda, para /como-jugar y el panel. */
export const ROUND_FAMILIES: readonly Omit<RoundDefinition, 'questionCount'>[] = [
  ROUND_WARMUP,
  ROUND_RADIO_PATIO,
  ROUND_BUZONES,
  ROUND_FICHA,
  ROUND_MEMORIA,
  ROUND_QUE_FALTA,
  ROUND_LA_JUNTA,
  ROUND_TELEFONILLO,
  ROUND_CHAOS,
  ROUND_ACTA,
  ROUND_LIGHTNING,
  ROUND_DERRAMA,
  ROUND_PRESIDENTE,
];

export function getGameFormat(id: string): GameFormat {
  return GAME_FORMATS.find((format) => format.id === id) ?? GAME_FORMATS[1];
}

export function totalQuestions(format: GameFormat): number {
  return format.rounds.reduce((sum, round) => sum + round.questionCount, 0);
}

export function estimatedSeconds(format: GameFormat): number {
  return totalQuestions(format) * SECONDS_PER_QUESTION_ESTIMATE;
}
