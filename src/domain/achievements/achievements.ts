/**
 * LOGROS — reconocimientos de la comunidad, no monetización.
 *
 * Son funciones puras sobre el resumen de la partida (y el acumulado del jugador), así
 * que se pueden evaluar en el servidor al cerrar la partida sin depender de la UI.
 * No hay cajas ni compras: solo cosas que se consiguen jugando.
 */

import type { Rareza } from '../powerups/powerups';
import type { AnsweredQuestion } from '../engine/state';
import type { GameSummary } from '../results/summary';

export type ContextoLogros = {
  summary: GameSummary;
  answers: readonly AnsweredQuestion[];
  config: {
    formatId: string;
    difficultyId: string;
    origin?: string;
  };
  /** Acumulado del jugador ANTES de esta partida. */
  perfil: {
    partidasTerminadas: number;
    mejorPuntuacion: number;
    mejorRacha: number;
  };
  /** Récord anterior en este formato+dificultad, si existía. */
  recordAnterior?: number | undefined;
  /** Curva de la partida anterior (fantasma) para detectar remontadas. */
  ghostTrail?: readonly number[] | undefined;
};

export type Logro = {
  id: string;
  label: string;
  descripcion: string;
  icon: string;
  rareza: Rareza;
  evaluar: (contexto: ContextoLogros) => boolean;
};

/** ¿El jugador iba por detrás del fantasma y acabó por delante? */
export function huboRemontada(
  scoreTrail: readonly number[],
  ghostTrail: readonly number[] | undefined,
): boolean {
  if (!ghostTrail || ghostTrail.length === 0 || scoreTrail.length === 0) return false;
  const comparables = Math.min(scoreTrail.length, ghostTrail.length);
  let ibaDetras = false;
  for (let indice = 0; indice < comparables - 1; indice += 1) {
    if ((scoreTrail[indice] ?? 0) < (ghostTrail[indice] ?? 0)) ibaDetras = true;
  }
  const finalPropio = scoreTrail[scoreTrail.length - 1] ?? 0;
  const finalFantasma = ghostTrail[ghostTrail.length - 1] ?? 0;
  return ibaDetras && finalPropio > finalFantasma;
}

function aciertosDeTipo(contexto: ContextoLogros, tipo: string) {
  const entrada = contexto.summary.byType.find((item) => item.type === tipo);
  return entrada ?? { asked: 0, correct: 0 };
}

function aciertosDeCategoria(contexto: ContextoLogros, categoria: string) {
  const entrada = contexto.summary.byCategory.find((item) => item.category === categoria);
  return entrada ?? { asked: 0, correct: 0 };
}

export const LOGROS: Logro[] = [
  {
    id: 'primera-junta',
    label: 'Primera junta',
    descripcion: 'Termina tu primera partida completa.',
    icon: '📋',
    rareza: 'comun',
    evaluar: (contexto) => contexto.perfil.partidasTerminadas === 0 && contexto.summary.totalQuestions > 0,
  },
  {
    id: 'cinco-seguidas',
    label: 'Cinco seguidas',
    descripcion: 'Consigue una racha de 5 aciertos.',
    icon: '🔥',
    rareza: 'comun',
    evaluar: (contexto) => contexto.summary.bestStreak >= 5,
  },
  {
    id: 'diez-seguidas',
    label: 'Diez seguidas',
    descripcion: 'Consigue una racha de 10 aciertos.',
    icon: '🌋',
    rareza: 'raro',
    evaluar: (contexto) => contexto.summary.bestStreak >= 10,
  },
  {
    id: 'sin-comodines',
    label: 'Sin pedir favores',
    descripcion: 'Termina una partida de 10 preguntas o más sin usar comodines.',
    icon: '🚫',
    rareza: 'curioso',
    evaluar: (contexto) =>
      contexto.summary.totalQuestions >= 10 && contexto.summary.totalPowerUpsUsed === 0,
  },
  {
    id: 'victoria-perfecta',
    label: 'Junta perfecta',
    descripcion: 'Acierta absolutamente todo en una partida de 10 preguntas o más.',
    icon: '🏆',
    rareza: 'legendario',
    evaluar: (contexto) =>
      contexto.summary.totalQuestions >= 10 &&
      contexto.summary.correctAnswers === contexto.summary.totalQuestions,
  },
  {
    id: 'maestro-radio-patio',
    label: 'Maestro de Radio Patio',
    descripcion: 'Acierta todos los verdadero/falso de una partida (al menos 5).',
    icon: '📡',
    rareza: 'curioso',
    evaluar: (contexto) => {
      const vf = aciertosDeTipo(contexto, 'TRUE_FALSE');
      return vf.asked >= 5 && vf.correct === vf.asked;
    },
  },
  {
    id: 'memoria-de-elefante',
    label: 'Memoria de elefante',
    descripcion: 'Acierta todas las pruebas de memoria de una partida (al menos 3).',
    icon: '🧠',
    rareza: 'raro',
    evaluar: (contexto) => {
      const memoria = aciertosDeTipo(contexto, 'MEMORY_GRID');
      const secuencia = aciertosDeTipo(contexto, 'SEQUENCE');
      const total = memoria.asked + secuencia.asked;
      const aciertos = memoria.correct + secuencia.correct;
      return total >= 3 && aciertos === total;
    },
  },
  {
    id: 'presidente-vitalicio',
    label: 'Presidente vitalicio',
    descripcion: 'Alcanza el rango máximo al final de una partida.',
    icon: '🏛️',
    rareza: 'legendario',
    evaluar: (contexto) => contexto.summary.rankId === 'leyenda-radio-patio',
  },
  {
    id: 'experto-en-temporadas',
    label: 'Experto en temporadas',
    descripcion: 'Acierta todas las preguntas de temporadas de una partida (al menos 3).',
    icon: '📅',
    rareza: 'curioso',
    evaluar: (contexto) => {
      const temporadas = aciertosDeCategoria(contexto, 'temporadas');
      return temporadas.asked >= 3 && temporadas.correct === temporadas.asked;
    },
  },
  {
    id: 'remontada-historica',
    label: 'Remontada histórica',
    descripcion: 'Ve por detrás de tu récord y acaba por delante.',
    icon: '📈',
    rareza: 'raro',
    evaluar: (contexto) => huboRemontada(contexto.summary.scoreTrail, contexto.ghostTrail),
  },
  {
    id: 'maraton-en-pie',
    label: 'Maratón en pie',
    descripcion: 'Termina una partida en formato maratón.',
    icon: '🏃',
    rareza: 'curioso',
    evaluar: (contexto) => contexto.config.formatId === 'maraton' && contexto.summary.totalQuestions >= 20,
  },
  {
    id: 'apuesta-valiente',
    label: 'Apuesta valiente',
    descripcion: 'Gana una apuesta de 1.000 puntos o más.',
    icon: '🎲',
    rareza: 'raro',
    evaluar: (contexto) =>
      contexto.answers.some((answer) => answer.wager >= 1000 && answer.correct),
  },
  {
    id: 'a-oscuras',
    label: 'A oscuras y sin miedo',
    descripcion: 'Acierta una pregunta con «Se ha ido la luz» activado.',
    icon: '💡',
    rareza: 'raro',
    evaluar: (contexto) =>
      contexto.answers.some(
        (answer) => answer.correct && answer.powerUpsUsed.includes('SE_HA_IDO_LA_LUZ'),
      ),
  },
  {
    id: 'cita-diaria',
    label: 'Cita diaria',
    descripcion: 'Termina el reto del día.',
    icon: '🗓️',
    rareza: 'comun',
    evaluar: (contexto) => contexto.config.origin === 'RETO_DIARIO',
  },
  {
    id: 'rey-del-telefonillo',
    label: 'Rey del telefonillo',
    descripcion: 'Acierta todas las preguntas de la ronda del telefonillo.',
    icon: '☎️',
    rareza: 'curioso',
    evaluar: (contexto) => {
      const ronda = contexto.summary.rounds.find((item) => item.roundId === 'llamada-al-telefonillo');
      return !!ronda && ronda.answered >= 2 && ronda.correct === ronda.answered;
    },
  },
];

export function logroPorId(id: string): Logro | undefined {
  return LOGROS.find((logro) => logro.id === id);
}

/** Logros conseguidos en esta partida que el jugador aún no tenía. */
export function evaluarLogros(
  contexto: ContextoLogros,
  yaConseguidos: readonly string[],
): Logro[] {
  return LOGROS.filter(
    (logro) => !yaConseguidos.includes(logro.id) && logro.evaluar(contexto),
  );
}
