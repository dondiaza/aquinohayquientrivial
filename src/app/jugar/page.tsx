import type { Metadata } from 'next';

import { startDailyChallenge } from '@/app/jugar/actions';
import { LinkButton } from '@/components/ui/Button';
import {
  ApartmentPlaque,
  DoorCard,
  IntercomPanel,
  PaperNotice,
} from '@/components/portal/Estructuras';
import { RESUMEN_PACK } from '@/content/anhqv/catalogos';
import { MODES } from '@/domain/copy/ui';
import { claveDelDia, configuracionDelReto } from '@/domain/challenges/daily';
import { ENGINE_EVENT_TYPES } from '@/domain/engine/engine-events';

export const metadata: Metadata = { title: 'Elegir modo' };

/** MODE_SELECT: las puertas del portal. Cada una es un modo de juego. */
export default function ModeSelectPage() {
  const reto = configuracionDelReto(claveDelDia(new Date()));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <ApartmentPlaque vivienda="Planta baja" titulo={MODES.title} />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <DoorCard
          numero="1"
          titulo={MODES.solo.title}
          descripcion={MODES.solo.text}
          href="/jugar/solo"
        />

        <DoorCard
          numero="2"
          titulo="Reto del día"
          descripcion={reto.titular}
          etiqueta={reto.seedLabel}
          href="/reto"
          tono="granate"
        />

        <DoorCard
          numero="3"
          titulo="Desafío compartido"
          descripcion="Una etiqueta, dos personas, la misma partida"
          href="/desafio"
        />

        <DoorCard
          numero="4"
          titulo="Tu ficha"
          descripcion="Avatar, rango, logros y récords"
          href="/perfil"
        />

        <DoorCard
          numero="5"
          titulo="El portal"
          descripcion="Quién vive en cada piso de Desengaño 21"
          href="/portal"
        />

        <DoorCard
          numero="6"
          titulo="Pruebas y modos"
          descripcion={`${RESUMEN_PACK.pruebas} pruebas y ${RESUMEN_PACK.modos} modos del catálogo`}
          href="/pruebas"
          tono="granate"
        />

        <DoorCard
          numero="7"
          titulo="Tarjetas"
          descripcion={`${RESUMEN_PACK.tarjetas} curiosidades para repasar`}
          href="/tarjetas"
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <IntercomPanel
          titulo={MODES.party.title}
          descripcion={MODES.party.text}
          etiqueta={MODES.party.cta}
          href="/unirse"
        />

        <PaperNotice tono="azul" className="p-3 text-xs">
          <p className="texto-sello">Preparado para Fase 3</p>
          <p className="mt-1 text-tinta-suave">
            Las rutas <code>/unirse</code>, <code>/sala/[code]</code> y <code>/host/[code]</code> ya
            existen, y el motor emite estos eventos tipados que viajarán por WebSocket:
          </p>
          <p className="mt-2 flex flex-wrap gap-1">
            {ENGINE_EVENT_TYPES.slice(0, 6).map((tipo) => (
              <span key={tipo} className="chip">
                {tipo}
              </span>
            ))}
            <span className="chip">…</span>
          </p>
        </PaperNotice>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <form action={startDailyChallenge}>
          <button type="submit" className="btn btn-rojo">
            ▶ Jugar el reto de hoy
          </button>
        </form>
        <LinkButton href="/" tone="fantasma" size="sm">
          ← Volver al portal
        </LinkButton>
      </div>
    </div>
  );
}
