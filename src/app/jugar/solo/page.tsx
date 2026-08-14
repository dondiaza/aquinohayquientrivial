import type { Metadata } from 'next';

import { startSoloGame } from '@/app/jugar/actions';
import { LinkButton } from '@/components/ui/Button';
import { Checkbox, Field, OptionCards, TextInput } from '@/components/ui/Form';
import { Nota, Papel, Placa } from '@/components/ui/Surfaces';
import { SETUP } from '@/domain/copy/ui';
import { DEFAULT_SETUP } from '@/domain/engine/config';
import { DIFFICULTY_LEVELS } from '@/domain/difficulty/levels';
import { GAME_FORMATS, totalQuestions } from '@/domain/rounds/formats';
import { CATEGORY_MIX, QUESTION_CATEGORIES } from '@/domain/questions/categories';

export const metadata: Metadata = { title: 'Configurar partida' };

/**
 * SETUP. Es un <form> normal que llama a un Server Action: funciona sin JavaScript,
 * no hay estado de cliente y no hay validación duplicada (Zod manda en el action).
 */
export default function SoloSetupPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Placa className="px-5 py-5 pt-7">
        <h1 className="text-3xl sm:text-4xl">{SETUP.title}</h1>
      </Placa>
      <p className="mt-3 text-sm text-tinta-suave">{SETUP.subtitle}</p>

      <form action={startSoloGame} className="mt-6 space-y-6">
        <Papel className="p-4 sm:p-5">
          <h2 className="text-lg">{SETUP.duration}</h2>
          <div className="mt-3">
            <OptionCards
              name="formatId"
              columns={3}
              defaultValue={DEFAULT_SETUP.formatId}
              options={GAME_FORMATS.map((format) => ({
                value: format.id,
                label: format.label,
                description: format.tagline,
                badge: `${format.estimatedMinutes} · ${totalQuestions(format)} preguntas`,
              }))}
            />
          </div>
        </Papel>

        <Papel className="p-4 sm:p-5">
          <h2 className="text-lg">{SETUP.difficulty}</h2>
          <div className="mt-3">
            <OptionCards
              name="difficultyId"
              columns={2}
              defaultValue={DEFAULT_SETUP.difficultyId}
              options={DIFFICULTY_LEVELS.map((level) => ({
                value: level.id,
                label: level.label,
                description: level.tagline,
                badge: `escala ${level.min}-${level.max}`,
              }))}
            />
          </div>
        </Papel>

        <Papel className="p-4 sm:p-5">
          <h2 className="text-lg">{SETUP.category}</h2>
          <div className="mt-3">
            <OptionCards
              name="category"
              columns={3}
              defaultValue={DEFAULT_SETUP.category}
              options={[
                {
                  value: CATEGORY_MIX,
                  label: 'Mezcla total',
                  description: 'Las catorce temáticas del banco, sin filtros',
                },
                ...QUESTION_CATEGORIES.map((category) => ({
                  value: category.id,
                  label: `${category.icon} ${category.label}`,
                  description: category.tagline,
                })),
              ]}
            />
          </div>
        </Papel>

        <Papel className="p-4 sm:p-5">
          <h2 className="text-lg">Ajustes</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Checkbox
              name="adaptiveDifficulty"
              label={SETUP.adaptive}
              hint={SETUP.adaptiveHint}
              defaultChecked={DEFAULT_SETUP.adaptiveDifficulty}
            />
            <Checkbox
              name="sinSpoilers"
              label={SETUP.spoilers}
              hint={SETUP.spoilersHint}
              defaultChecked={DEFAULT_SETUP.sinSpoilers}
            />
            <Field label={SETUP.name} htmlFor="playerName">
              <TextInput
                id="playerName"
                name="playerName"
                maxLength={24}
                placeholder={SETUP.namePlaceholder}
                autoComplete="off"
              />
            </Field>
          </div>
        </Papel>

        <Nota tone="papel" className="p-3 text-xs text-tinta-suave">
          No hay registro ni cuentas: se guarda una cookie anónima para poder recuperar tus
          partidas y estadísticas. Las preguntas salen del banco de la serie y cada una lleva su
          explicación al revelarla.
        </Nota>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-rojo btn-lg">
            ▶ {SETUP.submit}
          </button>
          <LinkButton href="/jugar" tone="fantasma" size="sm">
            ← {SETUP.back}
          </LinkButton>
        </div>
      </form>
    </div>
  );
}
