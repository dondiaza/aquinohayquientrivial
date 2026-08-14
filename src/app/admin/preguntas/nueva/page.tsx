import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createQuestionAction } from '../actions';
import { QuestionForm } from '@/components/admin/QuestionForm';
import { LinkButton } from '@/components/ui/Button';
import { Placa } from '@/components/ui/Surfaces';
import { isAdmin } from '@/server/admin';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Nueva pregunta' };

export default async function NewQuestionPage() {
  if (!(await isAdmin())) redirect('/admin/entrar');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Placa className="px-5 py-4 pt-6">
          <h1 className="text-2xl sm:text-3xl">Nueva pregunta</h1>
        </Placa>
        <LinkButton href="/admin/preguntas" tone="fantasma" size="sm">
          ← Al banco
        </LinkButton>
      </div>

      <div className="mt-5">
        <QuestionForm action={createQuestionAction} />
      </div>
    </div>
  );
}
