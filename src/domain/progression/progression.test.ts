import { describe, expect, it } from 'vitest';

import {
  RANGOS,
  nivelParaXp,
  progresoDeRango,
  rangoParaXp,
  rangoPorId,
  siguienteRango,
  xpForGame,
  type EntradaXp,
} from './progression';
import {
  LOGROS,
  evaluarLogros,
  huboRemontada,
  logroPorId,
  type ContextoLogros,
} from '../achievements/achievements';
import {
  claveDelDia,
  configuracionDelDesafio,
  configuracionDelReto,
  etiquetaDeSemilla,
  normalizarEtiqueta,
} from '../challenges/daily';
import { buildSummary } from '../results/summary';
import type { AnsweredQuestion } from '../engine/state';

const partidaBase: EntradaXp = {
  correctAnswers: 8,
  totalQuestions: 10,
  accuracyRatio: 0.8,
  averageDifficulty: 5,
  bestStreak: 4,
  distinctTypes: 3,
  finished: true,
};

describe('experiencia y rangos', () => {
  it('una partida sin terminar no da experiencia', () => {
    expect(xpForGame({ ...partidaBase, finished: false })).toBe(0);
  });

  it('más aciertos dan más experiencia', () => {
    const pocos = xpForGame({ ...partidaBase, correctAnswers: 2, accuracyRatio: 0.2 });
    const muchos = xpForGame(partidaBase);
    expect(muchos).toBeGreaterThan(pocos);
  });

  it('la dificultad y la variedad suman', () => {
    const facil = xpForGame({ ...partidaBase, averageDifficulty: 2 });
    const dificil = xpForGame({ ...partidaBase, averageDifficulty: 9 });
    expect(dificil).toBeGreaterThan(facil);

    const monotona = xpForGame({ ...partidaBase, distinctTypes: 1 });
    const variada = xpForGame({ ...partidaBase, distinctTypes: 6 });
    expect(variada).toBeGreaterThan(monotona);
  });

  it('el reto del día paga un poco más', () => {
    expect(xpForGame({ ...partidaBase, esRetoDiario: true })).toBeGreaterThan(
      xpForGame(partidaBase),
    );
  });

  it('farmear la partida más fácil apenas renta', () => {
    const facilCorta = xpForGame({
      correctAnswers: 4,
      totalQuestions: 4,
      accuracyRatio: 1,
      averageDifficulty: 1,
      bestStreak: 4,
      distinctTypes: 1,
      finished: true,
    });
    const largaDificil = xpForGame({
      correctAnswers: 30,
      totalQuestions: 40,
      accuracyRatio: 0.75,
      averageDifficulty: 8,
      bestStreak: 9,
      distinctTypes: 7,
      finished: true,
    });
    expect(largaDificil).toBeGreaterThan(facilCorta * 4);
  });

  it('los rangos se alcanzan en orden', () => {
    expect(rangoParaXp(0).id).toBe('visitante');
    expect(rangoParaXp(RANGOS[1].xp).id).toBe('inquilino');
    expect(rangoParaXp(999999).id).toBe('leyenda');
  });

  it('el nivel cuenta los rangos alcanzados', () => {
    expect(nivelParaXp(0)).toBe(1);
    expect(nivelParaXp(RANGOS[2].xp)).toBe(3);
  });

  it('el progreso hacia el siguiente rango está entre 0 y 1', () => {
    for (const xp of [0, 500, 2000, 8000, 999999]) {
      const progreso = progresoDeRango(xp);
      expect(progreso).toBeGreaterThanOrEqual(0);
      expect(progreso).toBeLessThanOrEqual(1);
    }
    expect(progresoDeRango(999999)).toBe(1);
    expect(siguienteRango(999999)).toBeUndefined();
  });

  it('un id desconocido cae en el primer rango', () => {
    expect(rangoPorId('inventado').id).toBe('visitante');
  });
});

// ── Logros ────────────────────────────────────────────────────────────────────

function respuesta(overrides: Partial<AnsweredQuestion> = {}): AnsweredQuestion {
  return {
    questionId: 'q',
    roundId: 'r',
    indexInGame: 0,
    type: 'MULTIPLE_CHOICE',
    difficulty: 5,
    category: 'general',
    answered: true,
    correct: true,
    accuracy: 1,
    responseMs: 3000,
    pointsAwarded: 1000,
    basePoints: 1000,
    timeBonus: 0,
    streakBonus: 0,
    multiplier: 1,
    streakAfter: 1,
    wager: 0,
    powerUpsUsed: [],
    submitted: { kind: 'OPTION', optionId: 'a' },
    maxPoints: 1800,
    ...overrides,
  };
}

function contexto(overrides: Partial<ContextoLogros> = {}): ContextoLogros {
  const answers = overrides.answers ?? Array.from({ length: 12 }, () => respuesta());
  const summary = buildSummary({
    answers,
    rounds: [],
    totalScore: 12000,
    bestStreak: 12,
    finishedAt: 1000,
    scoreTrail: answers.map((_, index) => (index + 1) * 1000),
  });
  return {
    summary,
    answers,
    config: { formatId: 'normal', difficultyId: 'vecino' },
    perfil: { partidasTerminadas: 0, mejorPuntuacion: 0, mejorRacha: 0 },
    ...overrides,
  };
}

describe('logros', () => {
  it('la primera junta solo se consigue una vez', () => {
    const nuevos = evaluarLogros(contexto(), []);
    expect(nuevos.map((logro) => logro.id)).toContain('primera-junta');

    const veterano = evaluarLogros(
      contexto({ perfil: { partidasTerminadas: 5, mejorPuntuacion: 1, mejorRacha: 1 } }),
      [],
    );
    expect(veterano.map((logro) => logro.id)).not.toContain('primera-junta');
  });

  it('no repite logros ya conseguidos', () => {
    const yaTiene = LOGROS.map((logro) => logro.id);
    expect(evaluarLogros(contexto(), yaTiene)).toEqual([]);
  });

  it('la junta perfecta exige acertar todo con al menos 10 preguntas', () => {
    const perfecta = evaluarLogros(contexto(), []);
    expect(perfecta.map((logro) => logro.id)).toContain('victoria-perfecta');

    const conFallo = [...Array.from({ length: 11 }, () => respuesta()), respuesta({ correct: false })];
    const imperfecta = evaluarLogros(contexto({ answers: conFallo }), []);
    expect(imperfecta.map((logro) => logro.id)).not.toContain('victoria-perfecta');
  });

  it('«sin pedir favores» se cae en cuanto usas un comodín', () => {
    const conComodin = [
      ...Array.from({ length: 11 }, () => respuesta()),
      respuesta({ powerUpsUsed: ['RADIO_PATIO'] }),
    ];
    const logros = evaluarLogros(contexto({ answers: conComodin }), []);
    expect(logros.map((logro) => logro.id)).not.toContain('sin-comodines');
  });

  it('detecta la remontada solo si ibas por detrás y acabas por delante', () => {
    expect(huboRemontada([100, 200, 900], [500, 600, 700])).toBe(true);
    expect(huboRemontada([900, 950, 1000], [100, 200, 300])).toBe(false);
    expect(huboRemontada([100, 200], undefined)).toBe(false);
    expect(huboRemontada([], [100])).toBe(false);
  });

  it('cada logro del catálogo se puede buscar por id', () => {
    for (const logro of LOGROS) {
      expect(logroPorId(logro.id)?.label).toBe(logro.label);
    }
    expect(logroPorId('no-existe')).toBeUndefined();
  });

  it('«a oscuras» necesita acertar con el comodín de riesgo', () => {
    const conRiesgo = [respuesta({ correct: true, powerUpsUsed: ['SE_HA_IDO_LA_LUZ'] })];
    expect(evaluarLogros(contexto({ answers: conRiesgo }), []).map((l) => l.id)).toContain(
      'a-oscuras',
    );

    const falladoConRiesgo = [respuesta({ correct: false, powerUpsUsed: ['SE_HA_IDO_LA_LUZ'] })];
    expect(
      evaluarLogros(contexto({ answers: falladoConRiesgo }), []).map((l) => l.id),
    ).not.toContain('a-oscuras');
  });
});

// ── Reto del día y desafíos ───────────────────────────────────────────────────

describe('reto del día', () => {
  it('la clave del día es estable para la misma fecha', () => {
    const fecha = new Date('2026-08-14T22:30:00Z');
    expect(claveDelDia(fecha)).toBe(claveDelDia(fecha));
    expect(claveDelDia(fecha)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('la configuración del reto es determinista', () => {
    const a = configuracionDelReto('2026-08-14');
    const b = configuracionDelReto('2026-08-14');
    expect(a).toEqual(b);
    expect(a.formatId).toBe('express');
    expect(a.seed).toContain('2026-08-14');
  });

  it('días distintos dan retos distintos', () => {
    const claves = ['2026-08-14', '2026-08-15', '2026-08-16', '2026-08-17', '2026-08-18'];
    const semillas = new Set(claves.map((clave) => configuracionDelReto(clave).seed));
    expect(semillas.size).toBe(claves.length);
  });
});

describe('desafíos con semilla', () => {
  it('normaliza la etiqueta escrita por una persona', () => {
    expect(normalizarEtiqueta('#21 desengaño')).toBe('21DESENGANO');
    expect(normalizarEtiqueta('  portal-13!! ')).toBe('PORTAL13');
  });

  it('la misma etiqueta produce la misma partida', () => {
    const a = configuracionDelDesafio('#21DESENGAÑO');
    const b = configuracionDelDesafio('21 desengano');
    expect(a).not.toBeNull();
    expect(a).toEqual(b);
  });

  it('rechaza etiquetas demasiado cortas', () => {
    expect(configuracionDelDesafio('a')).toBeNull();
    expect(configuracionDelDesafio('!!')).toBeNull();
  });

  it('la etiqueta generada de una semilla es estable', () => {
    expect(etiquetaDeSemilla('abc')).toBe(etiquetaDeSemilla('abc'));
    expect(etiquetaDeSemilla('abc')).toMatch(/^#\d{1,2}[A-Z]+$/);
  });
});
