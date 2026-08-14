import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LinkButton } from '@/components/ui/Button';
import { Chip, Nota, Papel, Placa } from '@/components/ui/Surfaces';
import { questionTypeMeta } from '@/domain/questions/registry';
import { QUESTION_TYPES } from '@/domain/questions/types';
import { isAdmin } from '@/server/admin';
import { countQuestions } from '@/server/questions/repository';
import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Administración' };

export default async function AdminHomePage() {
  if (!(await isAdmin())) redirect('/admin/entrar');

  const [bank, games, answers] = await Promise.all([
    countQuestions(),
    prisma.game.count(),
    prisma.gameAnswer.count(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Placa className="px-5 py-5 pt-7">
        <h1 className="text-3xl sm:text-4xl">Portería</h1>
      </Placa>
      <p className="mt-3 text-sm text-tinta-suave">
        Panel interno: banco de preguntas y estado del juego.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Papel className="p-4">
          <p className="texto-sello text-tinta-tenue">Preguntas</p>
          <p className="marcador text-3xl">{bank.total}</p>
        </Papel>
        <Papel className="p-4">
          <p className="texto-sello text-tinta-tenue">Activas</p>
          <p className="marcador text-3xl">{bank.active}</p>
        </Papel>
        <Papel className="p-4">
          <p className="texto-sello text-tinta-tenue">Verificadas</p>
          <p className="marcador text-3xl">{bank.verified}</p>
        </Papel>
        <Papel className="p-4">
          <p className="texto-sello text-tinta-tenue">Partidas / respuestas</p>
          <p className="marcador text-3xl">
            {games}
            <span className="text-base text-tinta-tenue"> / {answers}</span>
          </p>
        </Papel>
      </div>

      <Papel className="mt-4 p-4">
        <p className="texto-sello text-tinta-tenue">Preguntas por tipo</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUESTION_TYPES.map((type) => (
            <Chip key={type}>
              {questionTypeMeta(type).short}: {bank.byType[type] ?? 0}
            </Chip>
          ))}
        </div>
      </Papel>

      {bank.verified === 0 ? (
        <Nota tone="papel" className="mt-4 p-4 text-sm">
          <p className="texto-sello">Ninguna pregunta está verificada</p>
          <p className="mt-1 text-tinta-suave">
            El banco del pack llega con su nota de fuente y marcado como verificado. Si aquí no hay
            ninguna, el seed no se ha ejecutado: <code>npm run db:seed</code>. Al crear preguntas a
            mano, rellena la nota de fuente y marca «verificada» para que no salgan con el sello de
            pendiente de contrastar.
          </p>
        </Nota>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <LinkButton href="/admin/preguntas">Banco de preguntas</LinkButton>
        <LinkButton href="/admin/preguntas/nueva" tone="papel">
          Nueva pregunta
        </LinkButton>
        <LinkButton href="/" tone="fantasma" size="sm">
          ← Volver al portal
        </LinkButton>
      </div>
    </div>
  );
}
