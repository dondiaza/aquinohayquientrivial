import type { Metadata } from 'next';

import { LinkButton } from '@/components/ui/Button';
import { Nota, Papel, Placa } from '@/components/ui/Surfaces';
import { MODES } from '@/domain/copy/ui';

export const metadata: Metadata = { title: 'Elegir modo' };

/** MODE_SELECT: dos modos, uno jugable hoy y otro reservado para Fase 3. */
export default function ModeSelectPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Placa className="px-5 py-5 pt-7">
        <h1 className="text-3xl sm:text-4xl">{MODES.title}</h1>
      </Placa>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Papel className="flex flex-col p-5">
          <p className="texto-cartel text-2xl">{MODES.solo.title}</p>
          <p className="mt-2 flex-1 text-sm text-tinta-suave">{MODES.solo.text}</p>
          <div className="mt-4">
            <LinkButton href="/jugar/solo" size="lg" className="w-full">
              {MODES.solo.cta}
            </LinkButton>
          </div>
        </Papel>

        <Papel className="flex flex-col p-5">
          <p className="texto-cartel text-2xl text-tinta-tenue">{MODES.party.title}</p>
          <p className="mt-2 flex-1 text-sm text-tinta-suave">{MODES.party.text}</p>
          <div className="mt-4">
            <button type="button" className="btn btn-papel w-full" disabled aria-disabled>
              {MODES.party.cta}
            </button>
          </div>
          <Nota tone="azul" className="mt-3 p-3 text-xs">
            Las rutas <code>/unirse</code>, <code>/sala/[code]</code> y <code>/host/[code]</code> ya
            existen como reserva: el motor de juego no habrá que reescribirlo.
          </Nota>
        </Papel>
      </div>

      <p className="mt-6">
        <LinkButton href="/" tone="fantasma" size="sm">
          ← Volver al portal
        </LinkButton>
      </p>
    </div>
  );
}
