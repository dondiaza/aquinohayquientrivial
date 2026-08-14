/**
 * El banco real contra el motor real.
 *
 * Los tests del importador comprueban que el pack se traduce bien; estos comprueban lo
 * que de verdad importa: que con ese banco se puede jugar una partida entera de cada
 * formato sin quedarse sin preguntas, sin repetir y respetando el modo sin spoilers.
 */

import { describe, expect, it } from 'vitest';

import { bancoANHQV, preguntasJugables } from './banco';
import { importarPack } from './importar';
import { preguntasDelPack } from './banco';
import { PRUEBAS, MODOS, RONDAS, TARJETAS } from './catalogos';
import { playGame } from '@/test/fixtures';
import { makeConfig } from '@/test/fixtures';
import { GAME_FORMATS, totalQuestions } from '@/domain/rounds/formats';
import { QUESTION_TYPES } from '@/domain/questions/types';

const JUGABLES = preguntasJugables();

describe('banco ANHQV en el motor', () => {
  it('hay banco de sobra para el formato más largo', () => {
    const maraton = GAME_FORMATS[GAME_FORMATS.length - 1];
    expect(maraton).toBeDefined();
    if (!maraton) return;
    expect(JUGABLES.length).toBeGreaterThan(totalQuestions(maraton) * 10);
  });

  it.each(GAME_FORMATS.map((formato) => formato.id))(
    'se juega una partida completa del formato %s sin repetir pregunta',
    (formatId) => {
      const resultado = playGame(makeConfig({ formatId }), { pool: JUGABLES });

      expect(resultado.state.phase).toBe('GAME_RESULTS');
      const ids = resultado.state.answers.map((respuesta) => respuesta.questionId);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeGreaterThan(0);
      // Y tampoco dos formas del mismo hecho: es lo que evita el `factKey`.
      const huellas = resultado.state.answers
        .map((respuesta) => JUGABLES.find((pregunta) => pregunta.id === respuesta.questionId))
        .map((pregunta) => pregunta?.factKey)
        .filter((huella): huella is string => Boolean(huella));
      expect(new Set(huellas).size).toBe(huellas.length);
    },
  );

  it('con el modo sin spoilers no sale ninguna pregunta de destripe grave', () => {
    const resultado = playGame(makeConfig({ formatId: 'maraton', sinSpoilers: true }), {
      pool: JUGABLES,
    });

    const destripes = resultado.state.answers
      .map((respuesta) => JUGABLES.find((pregunta) => pregunta.id === respuesta.questionId))
      .filter((pregunta) => pregunta?.spoiler === 'major');

    expect(destripes).toEqual([]);
    expect(resultado.state.phase).toBe('GAME_RESULTS');
  });

  it('la partida es reproducible: misma semilla, mismas preguntas', () => {
    const config = makeConfig({ formatId: 'normal', seed: 'desengano-21' });
    const primera = playGame(config, { pool: JUGABLES });
    const segunda = playGame(config, { pool: JUGABLES });

    expect(segunda.state.answers.map((r) => r.questionId)).toEqual(
      primera.state.answers.map((r) => r.questionId),
    );
  });

  it('el importador es determinista', () => {
    const pack = preguntasDelPack();
    const uno = importarPack(pack).registros;
    const otro = importarPack(pack).registros;
    expect(JSON.stringify(otro)).toBe(JSON.stringify(uno));
  });

  it('cada familia jugable tiene preguntas repartidas por dificultad', () => {
    for (const tipo of QUESTION_TYPES) {
      const dificultades = new Set(
        JUGABLES.filter((pregunta) => pregunta.type === tipo).map((pregunta) => pregunta.difficulty),
      );
      expect(dificultades.size, `${tipo} solo tiene una dificultad`).toBeGreaterThan(1);
    }
  });
});

describe('catálogos del pack', () => {
  it('están completos y con los ids del pack', () => {
    expect(PRUEBAS).toHaveLength(260);
    expect(MODOS).toHaveLength(48);
    expect(RONDAS).toHaveLength(120);
    expect(TARJETAS).toHaveLength(174);
    expect(PRUEBAS[0]?.id).toBe('P001');
    expect(MODOS[0]?.id).toBe('M001');
    expect(RONDAS[0]?.id).toBe('R001');
    expect(TARJETAS[0]?.id).toBe('C0001');
  });

  it('las rondas preconstruidas apuntan a preguntas que existen', () => {
    const ids = new Set(bancoANHQV().registros.map((record) => record.id));
    const huerfanas: string[] = [];
    for (const ronda of RONDAS) {
      for (const id of ronda.preguntas) if (!ids.has(id)) huerfanas.push(`${ronda.id}:${id}`);
    }
    expect(huerfanas).toEqual([]);
  });

  it('las etiquetas legacy en cadena se han convertido a array', () => {
    for (const prueba of PRUEBAS) expect(Array.isArray(prueba.etiquetas)).toBe(true);
    for (const tarjeta of TARJETAS) expect(Array.isArray(tarjeta.etiquetas)).toBe(true);
    // P001 llega como «personajes» (cadena) y C0001 como «historia,fechas».
    expect(PRUEBAS.find((prueba) => prueba.id === 'P001')?.etiquetas).toEqual(['personajes']);
    expect(TARJETAS.find((tarjeta) => tarjeta.id === 'C0001')?.etiquetas).toEqual([
      'historia',
      'fechas',
    ]);
  });

  it('la errata de la muletilla más famosa está corregida en las tarjetas', () => {
    expect(TARJETAS.find((tarjeta) => tarjeta.id === 'C0102')?.reverso).toBe('Juan Cuesta');
  });
});
