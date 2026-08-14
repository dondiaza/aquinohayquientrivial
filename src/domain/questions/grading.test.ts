import { describe, expect, it } from 'vitest';

import { allowsPartialCredit, extendsStreak, gradeAnswer } from './grading';
import {
  makeFinalBet,
  makeImpostor,
  makeMultipleChoice,
  makeOrderChaos,
  makeTrueFalse,
  makeWhoIsIt,
} from '@/test/fixtures';

describe('evaluación de respuestas', () => {
  it('elección múltiple: acierto y fallo', () => {
    const question = makeMultipleChoice();
    const bien = gradeAnswer(question, { kind: 'OPTION', optionId: question.correctOptionId });
    expect(bien.isCorrect).toBe(true);
    expect(bien.accuracy).toBe(1);
    expect(bien.correctSummary).toBe('El del 2ºA');

    const mal = gradeAnswer(question, { kind: 'OPTION', optionId: 'b' });
    expect(mal.isCorrect).toBe(false);
    expect(mal.accuracy).toBe(0);
    expect(mal.submittedSummary).toBe('El del 3ºB');
  });

  it('verdadero/falso', () => {
    const question = makeTrueFalse({ answer: true });
    expect(gradeAnswer(question, { kind: 'BOOLEAN', value: true }).isCorrect).toBe(true);
    expect(gradeAnswer(question, { kind: 'BOOLEAN', value: false }).isCorrect).toBe(false);
    expect(gradeAnswer(question, { kind: 'BOOLEAN', value: true }).correctSummary).toBe('Verdadero');
  });

  it('¿quién es?: se responde eligiendo opción', () => {
    const question = makeWhoIsIt();
    expect(gradeAnswer(question, { kind: 'OPTION', optionId: question.correctOptionId }).isCorrect).toBe(
      true,
    );
  });

  it('el infiltrado: acierta quien señala al que no encaja', () => {
    const question = makeImpostor();
    expect(gradeAnswer(question, { kind: 'ITEM', itemId: question.impostorItemId }).isCorrect).toBe(true);
    expect(gradeAnswer(question, { kind: 'ITEM', itemId: 'a' }).isCorrect).toBe(false);
  });

  it('apuesta final: se evalúa como una elección múltiple', () => {
    const question = makeFinalBet();
    expect(gradeAnswer(question, { kind: 'OPTION', optionId: question.correctOptionId }).isCorrect).toBe(
      true,
    );
  });

  it('ordenar: acierto pleno, parcial y nulo', () => {
    const question = makeOrderChaos();
    const ids = question.steps.map((step) => step.id);

    const pleno = gradeAnswer(question, { kind: 'ORDER', orderedIds: ids });
    expect(pleno.isCorrect).toBe(true);
    expect(pleno.accuracy).toBe(1);

    // Intercambiar los dos últimos deja el primero en su sitio: 1 de 3.
    const parcial = gradeAnswer(question, {
      kind: 'ORDER',
      orderedIds: [ids[0]!, ids[2]!, ids[1]!],
    });
    expect(parcial.isCorrect).toBe(false);
    expect(parcial.accuracy).toBeCloseTo(1 / 3);

    const nulo = gradeAnswer(question, { kind: 'ORDER', orderedIds: [] });
    expect(nulo.accuracy).toBe(0);
    expect(nulo.submittedSummary).toContain('sin respuesta');
  });

  it('sin respuesta (tiempo agotado) nunca es correcta', () => {
    for (const question of [
      makeMultipleChoice(),
      makeTrueFalse(),
      makeWhoIsIt(),
      makeImpostor(),
      makeOrderChaos(),
      makeFinalBet(),
    ]) {
      const grade = gradeAnswer(question, { kind: 'NONE' });
      expect(grade.isCorrect).toBe(false);
      expect(grade.accuracy).toBe(0);
      expect(extendsStreak(grade)).toBe(false);
    }
  });

  it('una respuesta con la forma equivocada no cuela', () => {
    const question = makeTrueFalse({ answer: true });
    expect(gradeAnswer(question, { kind: 'OPTION', optionId: 'a' }).isCorrect).toBe(false);
  });

  it('solo «ordena el desastre» admite acierto parcial', () => {
    expect(allowsPartialCredit(makeOrderChaos())).toBe(true);
    expect(allowsPartialCredit(makeMultipleChoice())).toBe(false);
    expect(allowsPartialCredit(makeTrueFalse())).toBe(false);
  });

  it('la racha solo se alarga con acierto pleno', () => {
    const question = makeOrderChaos();
    const ids = question.steps.map((step) => step.id);
    const parcial = gradeAnswer(question, { kind: 'ORDER', orderedIds: [ids[0]!, ids[2]!, ids[1]!] });
    expect(parcial.accuracy).toBeGreaterThan(0);
    expect(extendsStreak(parcial)).toBe(false);
  });
});
