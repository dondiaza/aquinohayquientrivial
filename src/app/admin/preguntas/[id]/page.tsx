import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { deleteQuestionAction, duplicateQuestionAction, setStatusAction, updateQuestionAction } from '../actions';
import { QuestionForm } from '@/components/admin/QuestionForm';
import { LinkButton } from '@/components/ui/Button';
import { Chip, Papel, Placa } from '@/components/ui/Surfaces';
import { calibrationDrift } from '@/domain/questions/analytics';
import { isAdmin } from '@/server/admin';
import { getQuestion } from '@/server/questions/repository';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Editar pregunta' };

export default async function EditQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ guardada?: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin/entrar');

  const { id } = await params;
  const { guardada } = await searchParams;
  const entry = await getQuestion(id);
  if (!entry) notFound();

  const { question, stat } = entry;
  const drift = calibrationDrift(question.difficulty, stat.estimatedDifficulty);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Placa className="px-5 py-4 pt-6">
          <h1 className="text-2xl sm:text-3xl">Editar pregunta</h1>
        </Placa>
        <div className="flex flex-wrap gap-2">
          <form action={setStatusAction}>
            <input type="hidden" name="id" value={question.id} />
            <input
              type="hidden"
              name="status"
              value={question.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE'}
            />
            <button type="submit" className="btn btn-papel btn-sm">
              {question.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
            </button>
          </form>
          <form action={duplicateQuestionAction}>
            <input type="hidden" name="id" value={question.id} />
            <button type="submit" className="btn btn-papel btn-sm">
              Duplicar
            </button>
          </form>
          <form action={deleteQuestionAction}>
            <input type="hidden" name="id" value={question.id} />
            <button type="submit" className="btn btn-rojo btn-sm">
              Borrar
            </button>
          </form>
          <LinkButton href="/admin/preguntas" tone="fantasma" size="sm">
            ← Al banco
          </LinkButton>
        </div>
      </div>

      {/* ── Analítica de la pregunta ────────────────────────────────────────── */}
      <Papel className="mt-4 p-4">
        <p className="texto-sello text-tinta-tenue">Analítica</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip>mostrada {stat.timesShown}</Chip>
          <Chip>respondida {stat.timesAnswered}</Chip>
          <Chip>acierto {stat.successRate === null ? '—' : `${stat.successRate} %`}</Chip>
          <Chip>abandonos {stat.timesAbandoned}</Chip>
          <Chip>
            tiempo medio{' '}
            {stat.averageResponseMs === null ? '—' : `${(stat.averageResponseMs / 1000).toFixed(1)} s`}
          </Chip>
          <Chip>dificultad declarada {question.difficulty}</Chip>
          <Chip>estimada {stat.estimatedDifficulty ?? '—'}</Chip>
          {drift !== null && Math.abs(drift) >= 2 ? (
            <Chip className="border-rojo-buzon text-rojo-buzon">
              descuadre {drift > 0 ? '+' : ''}
              {drift} → conviene recalibrar
            </Chip>
          ) : null}
        </div>
        <p className="texto-sello mt-2 text-tinta-tenue">
          id <code>{question.id}</code> · creada {new Date(question.createdAt).toLocaleString('es-ES')}
        </p>
      </Papel>

      <div className="mt-5">
        <QuestionForm
          action={updateQuestionAction}
          question={question}
          savedNotice={guardada === '1'}
        />
      </div>
    </div>
  );
}
