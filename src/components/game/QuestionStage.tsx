'use client';

import { Chip, Sello } from '@/components/ui/Surfaces';
import { RarityBadge } from '@/components/portal/Espectaculo';
import { difficultyValueLabel } from '@/domain/difficulty/levels';
import { questionTypeMeta } from '@/domain/questions/registry';
import type { AnswerSubmission, Question, QuestionMedia } from '@/domain/questions/types';
import type { RoundPresentation } from '@/domain/rounds/formats';
import type { ActiveQuestion, RevealSummary } from '@/domain/engine/state';

import { DecisionView } from './views/DecisionView';
import { ImpostorView } from './views/ImpostorView';
import { MemoryGridView } from './views/MemoryGridView';
import { MissingItemView } from './views/MissingItemView';
import { MultipleChoiceView, OptionGrid } from './views/MultipleChoiceView';
import { OrderChaosView } from './views/OrderChaosView';
import { SequenceView } from './views/SequenceView';
import { TrueFalseView } from './views/TrueFalseView';
import { WhoIsItView } from './views/WhoIsItView';

/**
 * Hueco reservado para un asset propio. No se usa material protegido de terceros: si una
 * pregunta declara media, se muestra este marco sustituible hasta que exista el asset.
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
  studyRemainingMs = 0,
  presentation,
  onSubmit,
  onRevealClue,
}: {
  active: ActiveQuestion;
  phase: 'QUESTION' | 'ANSWER_LOCKED' | 'REVEAL' | 'FINAL_ROUND';
  reveal?: RevealSummary | undefined;
  submitted?: AnswerSubmission | undefined;
  studyRemainingMs?: number;
  presentation?: RoundPresentation;
  onSubmit: (submission: AnswerSubmission) => void;
  onRevealClue?: (() => void) | undefined;
}) {
  const question: Question = active.question;
  const meta = questionTypeMeta(question.type);
  const locked = phase !== 'QUESTION';
  const viewProps = {
    active,
    locked,
    reveal,
    submitted,
    studyRemainingMs,
    presentation,
    onSubmit,
    onRevealClue,
  };

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
      case 'MEMORY_GRID':
        return <MemoryGridView question={question} {...viewProps} />;
      case 'MISSING_ITEM':
        return <MissingItemView question={question} {...viewProps} />;
      case 'DECISION':
        return <DecisionView question={question} {...viewProps} />;
      case 'SEQUENCE':
        return <SequenceView question={question} {...viewProps} />;
    }
  })();

  // En memoria y secuencia el enunciado se lee ANTES; en el resto acompaña siempre.
  const ocultarEnunciado = meta.hasStudyPhase && studyRemainingMs <= 0;

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
          <RarityBadge key={modifier.id} rareza={modifier.multiplier >= 1.5 ? 'raro' : 'curioso'}>
            {modifier.label} ×{modifier.multiplier}
          </RarityBadge>
        ))}
        {active.wager > 0 ? (
          <Chip className="border-morado-junta text-morado-junta">Apostados {active.wager}</Chip>
        ) : null}
        {active.riskMode ? (
          <Chip className="border-rojo-buzon text-rojo-buzon">A oscuras</Chip>
        ) : null}
        {active.powerUpsBlocked ? <Chip>Sin comodines</Chip> : null}
        {!question.verified ? <Sello>Demo</Sello> : <Sello tone="ok">Verificada</Sello>}
      </div>

      {!ocultarEnunciado ? (
        <h2
          className="anim-aparecer text-[clamp(1.25rem,5.5vw,2rem)] leading-tight normal-case"
          style={{ fontFamily: 'var(--font-cuerpo)', fontWeight: 600 }}
        >
          {question.prompt}
        </h2>
      ) : null}

      {!meta.hasStudyPhase ? (
        <p className="texto-sello text-tinta-tenue">{meta.instruction}</p>
      ) : null}

      {question.media ? <MediaPlaceholder media={question.media} /> : null}

      {answerArea}
    </div>
  );
}
