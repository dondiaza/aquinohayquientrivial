import { describe, expect, it } from 'vitest';

import { createRng } from '../rng';
import { wrongOptionIds, type Question } from '../questions/types';
import {
  EXTRA_TIME_SECONDS,
  canUsePowerUp,
  chargesOf,
  createInventory,
  getPowerUp,
  spendCharge,
  POWER_UP_LIST,
  type PowerUpId,
} from './powerups';
import {
  makeImpostor,
  makeMultipleChoice,
  makeOrderChaos,
  makeTrueFalse,
  makeWhoIsIt,
} from '@/test/fixtures';

const rng = () => createRng('powerups');

const contextFor = (question: Question, eliminated: string[] = []) => ({
  question,
  eliminatedOptionIds: eliminated,
  answerLocked: false,
  usedThisQuestion: [] as PowerUpId[],
  cluesRevealed: 0,
});

describe('inventario', () => {
  it('arranca con las cargas por defecto de cada power-up', () => {
    const inventory = createInventory();
    for (const definicion of POWER_UP_LIST) {
      expect(chargesOf(inventory, definicion.id)).toBe(definicion.defaultCharges);
    }
    // Los raros vienen con una sola carga; los comunes, con varias.
    expect(chargesOf(inventory, 'UN_POQUITO_DE_POR_FAVOR')).toBeGreaterThan(1);
    expect(chargesOf(inventory, 'CAMBIO_DE_PRESIDENTE')).toBe(1);
  });

  it('acepta cargas personalizadas', () => {
    const inventory = createInventory({ RADIO_PATIO: 5 });
    expect(chargesOf(inventory, 'RADIO_PATIO')).toBe(5);
  });

  it('gastar una carga no baja de cero', () => {
    let inventory = createInventory({ RADIO_PATIO: 1 });
    inventory = spendCharge(inventory, 'RADIO_PATIO');
    expect(chargesOf(inventory, 'RADIO_PATIO')).toBe(0);
    inventory = spendCharge(inventory, 'RADIO_PATIO');
    expect(chargesOf(inventory, 'RADIO_PATIO')).toBe(0);
  });

  it('sin cargas no se puede usar', () => {
    const inventory = createInventory({ RADIO_PATIO: 0 });
    const result = canUsePowerUp('RADIO_PATIO', inventory, contextFor(makeMultipleChoice()));
    expect(result).toEqual({ ok: false, reason: 'NO_CHARGES' });
  });

  it('con la respuesta bloqueada no se puede usar', () => {
    const inventory = createInventory();
    const result = canUsePowerUp('UN_POQUITO_DE_POR_FAVOR', inventory, {
      ...contextFor(makeMultipleChoice()),
      answerLocked: true,
    });
    expect(result).toEqual({ ok: false, reason: 'ANSWER_LOCKED' });
  });
});

describe('un poquito de por favor', () => {
  it('añade tiempo en cualquier tipo de pregunta', () => {
    const powerUp = getPowerUp('UN_POQUITO_DE_POR_FAVOR');
    for (const question of [makeMultipleChoice(), makeTrueFalse(), makeOrderChaos(), makeImpostor()]) {
      expect(powerUp.resolveEffect(contextFor(question), rng())).toEqual({
        kind: 'ADD_TIME',
        seconds: EXTRA_TIME_SECONDS,
      });
    }
  });
});

describe('radio patio', () => {
  it('descarta una opción incorrecta', () => {
    const question = makeMultipleChoice();
    const effect = getPowerUp('RADIO_PATIO').resolveEffect(contextFor(question), rng());
    expect(effect?.kind).toBe('ELIMINATE_OPTION');
    if (effect?.kind === 'ELIMINATE_OPTION') {
      expect(wrongOptionIds(question)).toContain(effect.optionId);
      expect(effect.optionId).not.toBe(question.correctOptionId);
    }
  });

  it('nunca deja la pregunta con una sola opción viable', () => {
    const question = makeMultipleChoice();
    const wrong = wrongOptionIds(question);
    // Ya se han descartado dos de las tres incorrectas: no debe permitir una tercera.
    const context = contextFor(question, wrong.slice(0, 2));
    expect(canUsePowerUp('RADIO_PATIO', createInventory(), context)).toEqual({
      ok: false,
      reason: 'NOT_COMPATIBLE',
    });
    expect(getPowerUp('RADIO_PATIO').resolveEffect(context, rng())).toBeNull();
  });

  it('funciona en ¿quién es? pero no en verdadero/falso ni al ordenar', () => {
    const inventory = createInventory();
    expect(canUsePowerUp('RADIO_PATIO', inventory, contextFor(makeWhoIsIt())).ok).toBe(true);
    expect(canUsePowerUp('RADIO_PATIO', inventory, contextFor(makeTrueFalse())).ok).toBe(false);
    expect(canUsePowerUp('RADIO_PATIO', inventory, contextFor(makeOrderChaos())).ok).toBe(false);
    expect(canUsePowerUp('RADIO_PATIO', inventory, contextFor(makeImpostor())).ok).toBe(false);
  });
});
