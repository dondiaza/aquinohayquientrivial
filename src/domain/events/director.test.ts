import { describe, expect, it } from 'vitest';

import { createRng } from '../rng';
import {
  DIRECTOR,
  dirigirSuceso,
  probabilidadDeSuceso,
  sucesosCandidatos,
  type ContextoDirector,
} from './director';

const base: ContextoDirector = {
  questionIndex: 5,
  roundEventChance: 0.3,
  isFinalRound: false,
  questionsSinceEvent: 4,
  streak: 0,
  recentAccuracy: 0.6,
  seenEvents: [],
};

describe('director de partida', () => {
  it('no dispara sucesos en la ronda final', () => {
    expect(probabilidadDeSuceso({ ...base, isFinalRound: true })).toBe(0);
  });

  it('no dispara sucesos en las primeras preguntas', () => {
    expect(probabilidadDeSuceso({ ...base, questionIndex: 0 })).toBe(0);
    expect(probabilidadDeSuceso({ ...base, questionIndex: 1 })).toBe(0);
    expect(
      probabilidadDeSuceso({ ...base, questionIndex: DIRECTOR.primeraPreguntaConSucesos }),
    ).toBeGreaterThan(0);
  });

  it('respeta el enfriamiento entre sucesos', () => {
    expect(probabilidadDeSuceso({ ...base, questionsSinceEvent: 0 })).toBe(0);
    expect(probabilidadDeSuceso({ ...base, questionsSinceEvent: 1 })).toBe(0);
    expect(probabilidadDeSuceso({ ...base, questionsSinceEvent: 2 })).toBeGreaterThan(0);
  });

  it('no dispara nada si la ronda no quiere sucesos', () => {
    expect(probabilidadDeSuceso({ ...base, roundEventChance: 0 })).toBe(0);
  });

  it('sube la probabilidad con racha alta', () => {
    const normal = probabilidadDeSuceso(base);
    const caliente = probabilidadDeSuceso({ ...base, streak: 4 });
    expect(caliente).toBeGreaterThan(normal);
  });

  it('baja la probabilidad si el jugador va mal', () => {
    const normal = probabilidadDeSuceso(base);
    const sufriendo = probabilidadDeSuceso({ ...base, recentAccuracy: 0.2 });
    expect(sufriendo).toBeLessThan(normal);
  });

  it('empuja cuando hace mucho que no pasa nada', () => {
    const normal = probabilidadDeSuceso(base);
    const sequia = probabilidadDeSuceso({
      ...base,
      questionsSinceEvent: DIRECTOR.sequiaQueEmpuja + 1,
    });
    expect(sequia).toBeGreaterThan(normal);
  });

  it('nunca pasa del 90 %', () => {
    expect(
      probabilidadDeSuceso({
        ...base,
        roundEventChance: 1,
        streak: 9,
        questionsSinceEvent: 20,
      }),
    ).toBeLessThanOrEqual(0.9);
  });

  it('los sucesos con castigo solo salen si el jugador va bien', () => {
    const yendoMal = sucesosCandidatos({ ...base, recentAccuracy: 0.2 });
    expect(yendoMal.some((suceso) => suceso.effect.mustPass)).toBe(false);

    const yendoBien = sucesosCandidatos({ ...base, recentAccuracy: 0.9 });
    expect(yendoBien.some((suceso) => suceso.effect.mustPass)).toBe(true);
  });

  it('los sucesos que ayudan solo salen si el jugador va mal', () => {
    const yendoBien = sucesosCandidatos({ ...base, recentAccuracy: 0.9 });
    expect(yendoBien.some((suceso) => suceso.effect.grantPowerUp)).toBe(false);

    const yendoMal = sucesosCandidatos({ ...base, recentAccuracy: 0.1 });
    expect(yendoMal.some((suceso) => suceso.effect.grantPowerUp)).toBe(true);
  });

  it('evita repetir sucesos ya vistos mientras quede alguno nuevo', () => {
    const candidatos = sucesosCandidatos(base);
    const primero = candidatos[0]!;
    const siguientes = sucesosCandidatos({ ...base, seenEvents: [primero.id] });
    expect(siguientes.some((suceso) => suceso.id === primero.id)).toBe(false);
  });

  it('es determinista con la misma semilla', () => {
    const contexto = { ...base, roundEventChance: 0.9 };
    const a = dirigirSuceso(contexto, createRng('director'));
    const b = dirigirSuceso(contexto, createRng('director'));
    expect(a.suceso?.id).toBe(b.suceso?.id);
  });

  it('con probabilidad cero nunca devuelve suceso', () => {
    for (let index = 0; index < 20; index += 1) {
      const decision = dirigirSuceso(
        { ...base, isFinalRound: true },
        createRng(`semilla-${index}`),
      );
      expect(decision.suceso).toBeNull();
    }
  });
});
