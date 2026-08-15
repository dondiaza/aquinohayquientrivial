/**
 * Tests de liga. Lo que se comprueba son las promesas: que no gana quien más horas echa,
 * que no se castiga a quien se va de vacaciones y que la habilidad no es el XP.
 */

import { describe, expect, it } from 'vitest';

import {
  ASCIENDEN,
  MINIMOS_LIGA,
  RATING_INICIAL,
  TAMANO_GRUPO,
  TOPE_DIARIO_LIGA,
  actualizarSkill,
  cerrarGrupo,
  conTopeDiario,
  ligaAnterior,
  ligaSiguiente,
  puntosDeLiga,
  repartirEnGrupos,
} from './ligas';

const BUENA = {
  precision: 0.9,
  dificultadMedia: 6,
  respuestas: 20,
  segundos: 400,
  gano: false,
  esRetoDiario: false,
};

describe('puntos de liga', () => {
  it('una partida corta no puntúa', () => {
    expect(puntosDeLiga({ ...BUENA, respuestas: MINIMOS_LIGA.respuestas - 1 })).toBe(0);
    expect(puntosDeLiga({ ...BUENA, segundos: 10 })).toBe(0);
  });

  it('por debajo del 50 % de acierto no se puntúa', () => {
    expect(puntosDeLiga({ ...BUENA, precision: 0.49 })).toBe(0);
    expect(puntosDeLiga({ ...BUENA, precision: 0.5 })).toBe(0);
    expect(puntosDeLiga({ ...BUENA, precision: 0.75 })).toBeGreaterThan(0);
  });

  it('la precisión manda por encima del volumen', () => {
    const impecable = puntosDeLiga({ ...BUENA, precision: 1 });
    const mediocre = puntosDeLiga({ ...BUENA, precision: 0.6 });
    // Una partida perfecta vale más que tres mediocres: así el volumen no compra puestos.
    expect(impecable).toBeGreaterThan(mediocre * 3);
  });

  it('la dificultad multiplica', () => {
    const facil = puntosDeLiga({ ...BUENA, dificultadMedia: 2 });
    const dificil = puntosDeLiga({ ...BUENA, dificultadMedia: 9 });
    expect(dificil).toBeGreaterThan(facil);
  });

  it('el reto diario y ganar dan un extra, pero no deciden', () => {
    const normal = puntosDeLiga(BUENA);
    const conExtras = puntosDeLiga({ ...BUENA, gano: true, esRetoDiario: true });
    expect(conExtras).toBeGreaterThan(normal);
    expect(conExtras).toBeLessThan(normal * 2);
  });

  it('el tope diario impide que catorce horas compren la liga', () => {
    let acumulado = 0;
    for (let partida = 0; partida < 40; partida += 1) {
      const { suma } = conTopeDiario(puntosDeLiga({ ...BUENA, precision: 1 }), acumulado);
      acumulado += suma;
    }
    expect(acumulado).toBe(TOPE_DIARIO_LIGA);
  });
});

describe('cierre de grupo', () => {
  const participantes = Array.from({ length: 20 }, (_, indice) => ({
    userId: `u${indice}`,
    puntos: 200 - indice * 10,
    partidas: 5,
  }));

  it('suben los primeros y bajan los últimos', () => {
    const resultado = cerrarGrupo('plata', participantes);
    expect(resultado[0]?.resultado).toBe('ASCIENDE');
    expect(resultado[0]?.ligaNueva).toBe(ligaSiguiente('plata')?.id);
    expect(resultado[ASCIENDEN - 1]?.resultado).toBe('ASCIENDE');
    expect(resultado[ASCIENDEN]?.resultado).toBe('MANTIENE');

    const ultimo = resultado[resultado.length - 1];
    expect(ultimo?.resultado).toBe('DESCIENDE');
    expect(ultimo?.ligaNueva).toBe(ligaAnterior('plata')?.id);
  });

  it('quien no ha jugado NO desciende', () => {
    const conAusente = [
      ...participantes.slice(0, 19),
      { userId: 'devacaciones', puntos: 0, partidas: 0 },
    ];
    const resultado = cerrarGrupo('plata', conAusente);
    const ausente = resultado.find((entrada) => entrada.userId === 'devacaciones');
    expect(ausente?.resultado).toBe('MANTIENE');
  });

  it('en la liga más baja nadie desciende, y en la más alta nadie asciende', () => {
    const abajo = cerrarGrupo('portal', participantes);
    expect(abajo.every((entrada) => entrada.resultado !== 'DESCIENDE')).toBe(true);

    const arriba = cerrarGrupo('radio-patio', participantes);
    expect(arriba.every((entrada) => entrada.resultado !== 'ASCIENDE')).toBe(true);
  });

  it('a igualdad de puntos, gana quien lo hizo en menos partidas', () => {
    const empatados = [
      { userId: 'muchas', puntos: 100, partidas: 20 },
      { userId: 'pocas', puntos: 100, partidas: 4 },
    ];
    const resultado = cerrarGrupo('plata', empatados);
    expect(resultado[0]?.userId).toBe('pocas');
  });
});

describe('reparto en grupos', () => {
  it('hace grupos del tamaño objetivo y no pierde a nadie', () => {
    const jugadores = Array.from({ length: 47 }, (_, indice) => ({
      userId: `u${indice}`,
      skillRating: 1000 + indice * 10,
    }));

    const grupos = repartirEnGrupos(jugadores);
    const total = grupos.reduce((suma, grupo) => suma + grupo.length, 0);

    expect(total).toBe(47);
    expect(grupos.length).toBe(Math.ceil(47 / TAMANO_GRUPO));
    expect(new Set(grupos.flat()).size).toBe(47);
  });

  it('reparte por habilidad en serpiente, sin dejar un grupo de élite', () => {
    const jugadores = Array.from({ length: 40 }, (_, indice) => ({
      userId: `u${indice}`,
      skillRating: 2000 - indice * 25,
    }));
    const grupos = repartirEnGrupos(jugadores);
    // Los dos mejores no acaban en el mismo grupo.
    expect(grupos[0]?.includes('u0')).toBe(true);
    expect(grupos[0]?.includes('u1')).toBe(false);
  });

  it('con nadie, no hay grupos', () => {
    expect(repartirEnGrupos([])).toEqual([]);
  });
});

describe('habilidad', () => {
  it('sube al hacerlo bien en difícil y baja al hacerlo mal en fácil', () => {
    const subida = actualizarSkill(RATING_INICIAL, 0, { precision: 0.95, dificultadMedia: 8 });
    const bajada = actualizarSkill(RATING_INICIAL, 0, { precision: 0.3, dificultadMedia: 2 });
    expect(subida).toBeGreaterThan(RATING_INICIAL);
    expect(bajada).toBeLessThan(RATING_INICIAL);
  });

  it('se mueve menos cuando ya hay historial: una mala tarde no hunde a nadie', () => {
    const novato = actualizarSkill(RATING_INICIAL, 1, { precision: 0.2, dificultadMedia: 5 });
    const veterano = actualizarSkill(RATING_INICIAL, 60, { precision: 0.2, dificultadMedia: 5 });
    expect(RATING_INICIAL - veterano).toBeLessThan(RATING_INICIAL - novato);
  });

  it('nunca baja de un suelo', () => {
    let rating = 200;
    for (let vuelta = 0; vuelta < 50; vuelta += 1) {
      rating = actualizarSkill(rating, 100, { precision: 0, dificultadMedia: 10 });
    }
    expect(rating).toBeGreaterThanOrEqual(100);
  });
});
