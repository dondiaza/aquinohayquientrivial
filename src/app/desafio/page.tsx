import type { Metadata } from 'next';

import { startSeededChallenge } from '@/app/jugar/actions';
import { LinkButton } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Form';
import { ErrorNote } from '@/components/ui/Feedback';
import { Chip } from '@/components/ui/Surfaces';
import { ApartmentPlaque, PaperNotice } from '@/components/portal/Estructuras';
import { configuracionDelDesafio, etiquetaDeSemilla } from '@/domain/challenges/daily';
import { categoryLabel } from '@/domain/questions/categories';
import { getDifficultyLevel } from '@/domain/difficulty/levels';
import { getGameFormat, totalQuestions } from '@/domain/rounds/formats';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Desafío' };

/**
 * DESAFÍO CON SEMILLA — dos personas escriben la misma etiqueta y juegan exactamente la
 * misma partida, cada una a su hora. Es competición asíncrona sin infraestructura: la
 * etiqueta ES la semilla.
 */
export default async function ChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; etiqueta?: string }>;
}) {
  const { error, etiqueta } = await searchParams;

  // Tres sugerencias estables para que nadie tenga que inventarse una etiqueta.
  const sugerencias = ['portal-1', 'portal-2', 'portal-3'].map((semilla) =>
    etiquetaDeSemilla(semilla),
  );

  const previsualizacion = etiqueta ? configuracionDelDesafio(etiqueta) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ApartmentPlaque
        vivienda="Competición asíncrona"
        titulo="Desafío"
        subtitulo="Misma etiqueta, misma partida"
        tono="morada"
      />

      {error ? (
        <div className="mt-4">
          <ErrorNote titulo="Etiqueta no válida">
            Necesita al menos tres letras o números. Prueba con algo como{' '}
            <strong>{sugerencias[0]}</strong>.
          </ErrorNote>
        </div>
      ) : null}

      <PaperNotice tono="papel" sujecion="cinta" className="mt-4 p-4 pt-5">
        <p className="text-sm text-tinta-suave">
          Escribe una etiqueta y compártela con quien quieras: al usarla, los dos jugaréis la
          misma partida, con las mismas preguntas y en el mismo orden. No hace falta que estéis
          conectados a la vez.
        </p>

        <form action={startSeededChallenge} className="mt-4 space-y-3">
          <Field
            label="Etiqueta del desafío"
            htmlFor="etiqueta"
            hint="Se admiten letras y números. Los acentos y símbolos se ignoran."
          >
            <TextInput
              id="etiqueta"
              name="etiqueta"
              maxLength={24}
              required
              defaultValue={etiqueta ?? ''}
              placeholder={sugerencias[0]}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>

          <button type="submit" className="btn btn-rojo btn-lg w-full">
            ▶ Jugar este desafío
          </button>
        </form>

        <div className="mt-4">
          <p className="texto-sello text-tinta-tenue">Sugerencias</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {sugerencias.map((sugerencia) => (
              <li key={sugerencia}>
                <form action={startSeededChallenge}>
                  <input type="hidden" name="etiqueta" value={sugerencia} />
                  <button type="submit" className="btn btn-papel btn-sm">
                    {sugerencia}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      </PaperNotice>

      {previsualizacion ? (
        <PaperNotice tono="azul" className="mt-4 p-4">
          <p className="texto-sello">Ese desafío sería…</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip>{previsualizacion.seedLabel}</Chip>
            <Chip>{getGameFormat(previsualizacion.formatId).label}</Chip>
            <Chip>{totalQuestions(getGameFormat(previsualizacion.formatId))} preguntas</Chip>
            <Chip>Dificultad {getDifficultyLevel(previsualizacion.difficultyId).label}</Chip>
            <Chip>{categoryLabel(previsualizacion.category)}</Chip>
          </div>
        </PaperNotice>
      ) : null}

      <p className="mt-6 flex flex-wrap gap-2">
        <LinkButton href="/reto" tone="papel" size="sm">
          Reto del día
        </LinkButton>
        <LinkButton href="/" tone="fantasma" size="sm">
          ← Volver al portal
        </LinkButton>
      </p>
    </div>
  );
}
