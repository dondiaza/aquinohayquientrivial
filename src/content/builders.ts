/**
 * Constructores del banco de preguntas DEMO.
 *
 * Producen `QuestionRecord` (base + payload) ya validables con Zod, con ids estables
 * (slug) para que el seed sea idempotente: volver a sembrar actualiza, no duplica.
 */

import type { CategoryId } from '@/domain/questions/categories';
import type { QuestionRecord } from '@/domain/questions/schemas';
import type { QuestionStatus } from '@/domain/questions/types';

/** Fecha fija: el contenido semilla no debe cambiar entre ejecuciones. */
export const SEED_DATE = '2026-01-01T00:00:00.000Z';

export const DEMO_SOURCE_NOTE =
  'CONTENIDO DEMO — comunidad ficticia creada para probar el juego. No es canon de ninguna serie.';

export type CommonInput = {
  id: string;
  prompt: string;
  /** Escala interna 1-10. */
  difficulty: number;
  category: CategoryId;
  explanation?: string;
  season?: number;
  episode?: number;
  characters?: string[];
  tags?: string[];
  /** Segundos. Si no se indica, se usa el del tipo de prueba. */
  time?: number;
  points?: number;
  status?: QuestionStatus;
  /** true solo para contenido comprobado contra una fuente fiable. */
  verified?: boolean;
  /** Destacada: el panel la marca y el director de partida la prioriza. */
  featured?: boolean;
  sourceNote?: string;
};

function base(input: CommonInput, defaultTime: number, defaultPoints: number) {
  return {
    id: input.id,
    status: input.status ?? ('ACTIVE' as QuestionStatus),
    prompt: input.prompt,
    ...(input.explanation ? { explanation: input.explanation } : {}),
    difficulty: input.difficulty,
    category: input.category,
    ...(input.season ? { season: input.season } : {}),
    ...(input.episode ? { episode: input.episode } : {}),
    characters: input.characters ?? [],
    tags: input.tags ?? [],
    basePoints: input.points ?? defaultPoints,
    timeLimitSeconds: input.time ?? defaultTime,
    sourceNote: input.sourceNote ?? DEMO_SOURCE_NOTE,
    verified: input.verified ?? false,
    featured: input.featured ?? false,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  };
}

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;

function toOptions(texts: readonly string[]) {
  return texts.map((text, index) => ({ id: LETTERS[index] ?? `o${index}`, text }));
}

/** Opciones con icono del portal: «buzon:Buzón» → { icon: 'buzon', text: 'Buzón' }. */
function toOptionsConIcono(entradas: readonly string[]) {
  return entradas.map((entrada, index) => {
    const [icono, texto] = entrada.includes(':') ? entrada.split(':') : [undefined, entrada];
    return {
      id: LETTERS[index] ?? `o${index}`,
      text: (texto ?? entrada).trim(),
      ...(icono ? { icon: icono.trim() } : {}),
    };
  });
}

function optionId(index: number): string {
  return LETTERS[index] ?? `o${index}`;
}

/** 1. Elección múltiple: 4 opciones, `correct` es el índice (0-3). */
export function mc(
  input: CommonInput & { options: readonly [string, string, string, string]; correct: 0 | 1 | 2 | 3 },
): QuestionRecord {
  return {
    ...base(input, 20, 1000),
    type: 'MULTIPLE_CHOICE',
    payload: {
      options: toOptions(input.options),
      correctOptionId: optionId(input.correct),
    },
  };
}

/** 2. Verdadero / falso. */
export function tf(input: CommonInput & { answer: boolean }): QuestionRecord {
  return {
    ...base(input, 12, 700),
    type: 'TRUE_FALSE',
    payload: { correctValue: input.answer },
  };
}

/** 3. ¿Quién es? Pistas de más vaga a más evidente. */
export function who(
  input: CommonInput & {
    clues: readonly string[];
    options: readonly string[];
    correct: number;
    clueIntervalSeconds?: number;
  },
): QuestionRecord {
  return {
    ...base(input, 25, 1000),
    type: 'WHO_IS_IT',
    payload: {
      clues: [...input.clues],
      options: toOptions(input.options),
      correctOptionId: optionId(input.correct),
      clueIntervalSeconds: input.clueIntervalSeconds ?? 5,
    },
  };
}

/** 4. El infiltrado: 4 elementos, `impostor` es el índice del que no encaja. */
export function imp(
  input: CommonInput & {
    setLabel: string;
    items: readonly [string, string, string, string];
    impostor: 0 | 1 | 2 | 3;
  },
): QuestionRecord {
  return {
    ...base(input, 22, 1000),
    type: 'IMPOSTOR',
    payload: {
      setLabel: input.setLabel,
      items: toOptions(input.items),
      impostorItemId: optionId(input.impostor),
    },
  };
}

/** 5. Ordena el desastre: `steps` en el ORDEN CORRECTO. */
export function ord(
  input: CommonInput & {
    steps: readonly string[];
    firstLabel?: string;
    lastLabel?: string;
  },
): QuestionRecord {
  return {
    ...base(input, 35, 1200),
    type: 'ORDER_CHAOS',
    payload: {
      steps: input.steps.map((text, index) => ({ id: `s${index + 1}`, text })),
      firstLabel: input.firstLabel ?? 'Primero',
      lastLabel: input.lastLabel ?? 'Último',
    },
  };
}

/** 6. Apuesta final. */
export function bet(
  input: CommonInput & {
    options: readonly [string, string, string, string];
    correct: 0 | 1 | 2 | 3;
    maxWagerRatio?: number;
  },
): QuestionRecord {
  return {
    ...base(input, 30, 1000),
    type: 'FINAL_BET',
    payload: {
      options: toOptions(input.options),
      correctOptionId: optionId(input.correct),
      maxWagerRatio: input.maxWagerRatio ?? 0.5,
    },
  };
}

/** 7. Memoria de vecino. `items` admite «icono:Texto». */
export function mem(
  input: CommonInput & {
    items: readonly string[];
    question: string;
    options: readonly [string, string, string, string];
    correct: 0 | 1 | 2 | 3;
    studySeconds?: number;
  },
): QuestionRecord {
  return {
    ...base(input, 18, 1100),
    type: 'MEMORY_GRID',
    payload: {
      items: toOptionsConIcono(input.items),
      studySeconds: input.studySeconds ?? 5,
      question: input.question,
      options: toOptions(input.options),
      correctOptionId: optionId(input.correct),
    },
  };
}

/** 8. ¿Qué falta aquí? `present` y `options` admiten «icono:Texto». */
export function falta(
  input: CommonInput & {
    sceneLabel: string;
    present: readonly string[];
    options: readonly [string, string, string, string];
    correct: 0 | 1 | 2 | 3;
  },
): QuestionRecord {
  return {
    ...base(input, 22, 1100),
    type: 'MISSING_ITEM',
    payload: {
      sceneLabel: input.sceneLabel,
      present: toOptionsConIcono(input.present),
      options: toOptionsConIcono(input.options),
      correctOptionId: optionId(input.correct),
    },
  };
}

/** 9. La junta: decisiones con peso y consecuencia. La primera es la mejor (peso 1). */
export function junta(
  input: CommonInput & {
    situation: string;
    decisiones: readonly { texto: string; peso: number; consecuencia: string }[];
  },
): QuestionRecord {
  const options = input.decisiones.map((decision, index) => ({
    id: optionId(index),
    text: decision.texto,
    weight: decision.peso,
    outcome: decision.consecuencia,
  }));
  const mejor = options.find((option) => option.weight === 1) ?? options[0];
  return {
    ...base(input, 30, 1200),
    type: 'DECISION',
    payload: {
      situation: input.situation,
      options,
      bestOptionId: mejor ? mejor.id : 'a',
    },
  };
}

/** 10. Portero automático: secuencia de timbres (índices de `pads`). */
export function timbres(
  input: CommonInput & {
    pads: readonly string[];
    /** Índices de `pads`, en orden. */
    secuencia: readonly number[];
    stepMs?: number;
  },
): QuestionRecord {
  const pads = toOptions(input.pads);
  return {
    ...base(input, 20, 1100),
    type: 'SEQUENCE',
    payload: {
      pads,
      sequence: input.secuencia.map((indice) => pads[indice]?.id ?? 'a'),
      stepMs: input.stepMs ?? 650,
    },
  };
}
