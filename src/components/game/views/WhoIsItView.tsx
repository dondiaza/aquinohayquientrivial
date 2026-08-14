'use client';

import { Button } from '@/components/ui/Button';
import { Nota } from '@/components/ui/Surfaces';
import { GAME } from '@/domain/copy/ui';
import { SCORING } from '@/domain/scoring/scoring';

import { OptionGrid } from './MultipleChoiceView';
import type { QuestionViewProps } from './types';
import type { WhoIsItQuestion } from '@/domain/questions/types';

/**
 * ¿QUIÉN ES? Las pistas se revelan de una en una (automáticamente cada X segundos, o
 * a petición). Cada pista sin usar multiplica los puntos, así que responder pronto
 * renta: el multiplicador se muestra en pantalla para que la decisión sea informada.
 */
export function WhoIsItView(props: QuestionViewProps<WhoIsItQuestion>) {
  const { question, active, locked, onRevealClue } = props;
  const revealed = Math.min(active.cluesRevealed, question.clues.length);
  const unused = Math.max(0, question.clues.length - revealed);
  const multiplier = 1 + unused * SCORING.cluePremiumPerUnusedClue;
  const canAskMore = !locked && revealed < question.clues.length;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="texto-sello">
            {GAME.clues} {revealed}/{question.clues.length}
          </p>
          <p className="texto-sello text-verde-portal">
            multiplicador ×{multiplier.toFixed(2).replace(/\.00$/, '')}
          </p>
        </div>

        <ol className="mt-2 space-y-2">
          {question.clues.slice(0, revealed).map((clue, index) => (
            <li key={clue}>
              <Nota
                tone={index === revealed - 1 ? 'mostaza' : 'papel'}
                tilt={index % 2 === 0 ? 'izq' : 'der'}
                className="p-3"
              >
                <span className="texto-sello mr-2 text-tinta-tenue">Pista {index + 1}</span>
                <span className="text-base sm:text-lg">{clue}</span>
              </Nota>
            </li>
          ))}
        </ol>

        <div className="mt-3">
          {canAskMore ? (
            <Button tone="fantasma" size="sm" onClick={onRevealClue}>
              + {GAME.revealClue}
            </Button>
          ) : (
            <p className="texto-sello text-tinta-tenue">
              {locked ? '' : GAME.cluesExhausted}
            </p>
          )}
        </div>
      </div>

      <OptionGrid {...props} question={question} />
    </div>
  );
}
