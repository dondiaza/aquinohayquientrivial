'use client';

import { Chip, Sello } from '@/components/ui/Surfaces';
import { difficultyValueLabel } from '@/domain/difficulty/levels';
import { questionTypeMeta } from '@/domain/questions/registry';
import type { AnswerSubmission, Question, QuestionMedia } from '@/domain/questions/types';
import type { ActiveQuestion, RevealSummary } from '@/domain/engine/state';

import { ImpostorView } from './views/ImpostorView';
import { MultipleChoiceView, OptionGrid } from './views/MultipleChoiceView';
import { OrderChaosView } from './views/OrderChaosView';
import { TrueFalseView } from './views/TrueFalseView';
import { WhoIsItView } from './views/WhoIsItView';

/**
 * Hueco reservado para un asset propio. En Fase 1 no se usa material protegido de
 * terceros: si una pregunta declara media, se muestra este marco sustituible.
 */
function MediaPlaceholder({ media }: { media: QuestionMedia }) {
  if (media.src) {
    return media.kind === 'image' ? (
      // <img> a propósito: los assets son propios, estáticos y de tamaño conocido; no
      // necesitan la optimización de next/image y así el juego no depende de ella.
      <img
        src={media.src}
        alt={media.alt ?? media.placeholder}
        className="max-h-48 w-full border-2 border-tinta object-cover"
      />
    ) : (
      <p className="border-2 border-dashed border-tinta-tenue p-3 text-sm">{media.placeholder}</p>
    );
  }
  return (
    <div className="flex items-center gap-3 border-2 border-dashed border-tinta-tenue bg-white/40 p-3">
      <span aria-hidden className="text-2xl">
        {media.kind === 'audio' ? '🔊' : media.kind === 'video' ? '🎬' : '🖼️'}
      </span>
      <span className="text-sm text-tinta-suave">
        {media.placeholder}
        <span className="texto-sello ml-2 text-tinta-tenue">asset pendiente</span>
      </span>
    </div>
  );
}

/**
 * Escenario de la pregunta: cabecera común + la vista propia de cada tipo.
 * El `switch` es exhaustivo: si mañana se añade un tipo, TypeScript obliga a cubrirlo.
 */
export function QuestionStage({
  active,
  phase,
  reveal,
  submitted,
  onSubmit,
  onRevealClue,
}: {
  active: ActiveQuestion;
  phase: 'QUESTION' | 'ANSWER_LOCKED' | 'REVEAL' | 'FINAL_ROUND';
  reveal?: RevealSummary | undefined;
  submitted?: AnswerSubmission | undefined;
  onSubmit: (submission: AnswerSubmission) => void;
  onRevealClue?: (() => void) | undefined;
}) {
  const question: Question = active.question;
  const meta = questionTypeMeta(question.type);
  const locked = phase !== 'QUESTION';
  const viewProps = { active, locked, reveal, submitted, onSubmit, onRevealClue };

  const answerArea = (() => {
    switch (question.type) {
      case 'MULTIPLE_CHOICE':
        return <MultipleChoiceView question={question} {...viewProps} />;
      case 'TRUE_FALSE':
        return <TrueFalseView question={question} {...viewProps} />;
      case 'WHO_IS_IT':
        return <WhoIsItView question={question} {...viewProps} />;
      case 'IMPOSTOR':
        return <ImpostorView question={question} {...viewProps} />;
      case 'ORDER_CHAOS':
        return <OrderChaosView question={question} {...viewProps} />;
      case 'FINAL_BET':
        return <OptionGrid question={question} {...viewProps} />;
    }
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip>
          <span aria-hidden>{meta.icon}</span> {meta.label}
        </Chip>
        <Chip title={`Dificultad interna ${question.difficulty}/10`}>
          {difficultyValueLabel(question.difficulty)}
        </Chip>
        {active.modifiers.map((modifier) => (
          <Chip key={modifier.id} className="border-rojo-buzon text-rojo-buzon">
            {modifier.label} ×{modifier.multiplier}
          </Chip>
        ))}
        {active.wager > 0 ? (
          <Chip className="border-morado-junta text-morado-junta">Apostados {active.wager}</Chip>
        ) : null}
        {!question.verified ? <Sello>Demo</Sello> : <Sello tone="ok">Verificada</Sello>}
      </div>

      <h2 className="text-2xl leading-tight normal-case sm:text-3xl" style={{ fontFamily: 'var(--font-cuerpo)' }}>
        {question.prompt}
      </h2>

      <p className="texto-sello text-tinta-tenue">{meta.instruction}</p>

      {question.media ? <MediaPlaceholder media={question.media} /> : null}

      {answerArea}
    </div>
  );
}
