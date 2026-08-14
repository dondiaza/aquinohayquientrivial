'use client';

import { Button } from '@/components/ui/Button';
import { PaperNotice } from '@/components/portal/Estructuras';
import { MailboxWall } from '@/components/portal/MailboxWall';
import { GAME } from '@/domain/copy/ui';
import { SCORING } from '@/domain/scoring/scoring';

import { OptionGrid } from './MultipleChoiceView';
import type { QuestionViewProps } from './types';
import type { WhoIsItQuestion } from '@/domain/questions/types';

const NUMEROS_BUZON = ['1ºA', '1ºB', '2ºA', '2ºB', '3ºA', '3ºB'];

/**
 * ¿QUIÉN ES? — pistas progresivas. Cada pista sin usar multiplica los puntos, así que la
 * decisión de arriesgar pronto es informada: el multiplicador está siempre a la vista.
 *
 * En las rondas con presentación de BUZONES (el minijuego), las pistas no se revelan
 * solas: están dentro de los buzones y el jugador decide cuántos abre.
 */
export function WhoIsItView(props: QuestionViewProps<WhoIsItQuestion>) {
  const { question, active, locked, onRevealClue, presentation } = props;
  const revelado = Math.min(active.cluesRevealed, question.clues.length);
  const sinUsar = Math.max(0, question.clues.length - revelado);
  const multiplicador = 1 + sinUsar * SCORING.cluePremiumPerUnusedClue;
  const puedePedirMas = !locked && revelado < question.clues.length;
  const esBuzones = presentation === 'buzones';

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="texto-sello">
            {GAME.clues} {revelado}/{question.clues.length}
          </p>
          <p className="texto-sello text-verde-portal">
            multiplicador ×{multiplicador.toFixed(2).replace(/\.00$/, '')}
          </p>
        </div>

        {esBuzones ? (
          <div className="mt-2">
            <MailboxWall
              buzones={question.clues.map((pista, indice) => ({
                id: `pista-${indice}`,
                numero: NUMEROS_BUZON[indice] ?? `Buzón ${indice + 1}`,
                abierto: indice < revelado,
                contenido: pista,
                deshabilitado: locked || indice !== revelado,
              }))}
              onAbrir={() => onRevealClue?.()}
            />
            {puedePedirMas ? (
              <p className="texto-sello mt-2 text-center text-tinta-tenue">
                Abre solo los que necesites: cada buzón abierto resta multiplicador
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <ol className="mt-2 space-y-2">
              {question.clues.slice(0, revelado).map((pista, indice) => (
                <li key={pista}>
                  <PaperNotice
                    tono={indice === revelado - 1 ? 'mostaza' : 'papel'}
                    giro={indice % 2 === 0 ? 'izq' : 'der'}
                    className="anim-entrar-izquierda p-3"
                  >
                    <span className="texto-sello mr-2 text-tinta-tenue">Pista {indice + 1}</span>
                    <span className="text-base sm:text-lg">{pista}</span>
                  </PaperNotice>
                </li>
              ))}
            </ol>

            <div className="mt-3">
              {puedePedirMas ? (
                <Button tone="fantasma" size="sm" onClick={onRevealClue}>
                  + {GAME.revealClue}
                </Button>
              ) : (
                <p className="texto-sello text-tinta-tenue">{locked ? '' : GAME.cluesExhausted}</p>
              )}
            </div>
          </>
        )}
      </div>

      <OptionGrid {...props} question={question} />
    </div>
  );
}
