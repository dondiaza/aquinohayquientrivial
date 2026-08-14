/**
 * Rangos finales.
 *
 * El rango NO depende solo de la puntuación bruta (que varía con la duración de la
 * partida), sino de un índice de rendimiento:
 *
 *   índice = 0.65 · (aciertos / preguntas)  +  0.35 · (puntos / puntos máximos)
 *
 * Así una partida express y una maratón se pueden comparar, y la precisión pesa más
 * que la acumulación de puntos.
 */

export type Rank = {
  id: string;
  label: string;
  line: string;
  /** Índice mínimo (0..1) para alcanzarlo. */
  minIndex: number;
  icon: string;
};

export const RANKS: Rank[] = [
  {
    id: 'visitante',
    label: 'Visitante',
    line: 'Has llamado al telefonillo y poco más.',
    minIndex: 0,
    icon: '🔔',
  },
  {
    id: 'nuevo-vecino',
    label: 'Nuevo vecino',
    line: 'Ya te suena alguna cara del portal.',
    minIndex: 0.3,
    icon: '📦',
  },
  {
    id: 'propietario',
    label: 'Propietario',
    line: 'Pagas la derrama y opinas en la junta.',
    minIndex: 0.5,
    icon: '🔑',
  },
  {
    id: 'presidente',
    label: 'Presidente',
    line: 'Nadie quería el cargo y aquí estás.',
    minIndex: 0.68,
    icon: '📋',
  },
  {
    id: 'presidente-vitalicio',
    label: 'Presidente vitalicio',
    line: 'Ya no hay elecciones, hay costumbre.',
    minIndex: 0.82,
    icon: '🏆',
  },
  {
    id: 'leyenda-radio-patio',
    label: 'Leyenda de Radio Patio',
    line: 'Sabes cosas que ni han pasado todavía.',
    minIndex: 0.92,
    icon: '📡',
  },
];

export const RANK_WEIGHTS = {
  accuracy: 0.65,
  score: 0.35,
} as const;

export function performanceIndex(input: {
  correctAnswers: number;
  totalQuestions: number;
  totalScore: number;
  maxPossibleScore: number;
}): number {
  const accuracyRatio = input.totalQuestions > 0 ? input.correctAnswers / input.totalQuestions : 0;
  const scoreRatio =
    input.maxPossibleScore > 0 ? Math.max(0, input.totalScore) / input.maxPossibleScore : 0;
  const index = accuracyRatio * RANK_WEIGHTS.accuracy + Math.min(1, scoreRatio) * RANK_WEIGHTS.score;
  return Math.round(Math.min(1, Math.max(0, index)) * 1000) / 1000;
}

export function rankForIndex(index: number): Rank {
  let rank: Rank = RANKS[0] as Rank;
  for (const candidate of RANKS) {
    if (index >= candidate.minIndex) rank = candidate;
  }
  return rank;
}

/** Rango a partir de su id (el resumen guardado solo almacena el id). */
export function rankById(id: string): Rank {
  return RANKS.find((rank) => rank.id === id) ?? (RANKS[0] as Rank);
}

export function nextRank(index: number): Rank | undefined {
  return RANKS.find((candidate) => candidate.minIndex > index);
}
