import type { Metadata } from 'next';

import { startDailyChallenge } from '@/app/jugar/actions';
import { LinkButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Surfaces';
import { ApartmentPlaque, PaperNotice } from '@/components/portal/Estructuras';
import { NeighbourAvatar } from '@/components/portal/Avatar';
import { GameShowBanner } from '@/components/portal/Espectaculo';
import { claveDelDia, configuracionDelReto } from '@/domain/challenges/daily';
import { categoryLabel } from '@/domain/questions/categories';
import { getDifficultyLevel } from '@/domain/difficulty/levels';
import { getGameFormat, totalQuestions } from '@/domain/rounds/formats';
import { clasificacionDelDia, resultadoDelDia } from '@/server/players/service';
import { currentGuestPlayerId } from '@/server/guest';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Reto del día' };

function fechaLegible(dailyKey: string): string {
  const [ano, mes, dia] = dailyKey.split('-').map((parte) => Number.parseInt(parte, 10));
  if (!ano || !mes || !dia) return dailyKey;
  return new Date(ano, mes - 1, dia).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * RETO DEL DÍA — misma partida para todo el mundo durante el día, sin cuenta.
 *
 * La configuración se deriva del día (ver domain/challenges/daily.ts), así que esta
 * página no necesita ningún estado de servidor para «generar» el reto: solo lo calcula.
 */
export default async function DailyChallengePage() {
  const dailyKey = claveDelDia(new Date());
  const reto = configuracionDelReto(dailyKey);
  const format = getGameFormat(reto.formatId);
  const nivel = getDifficultyLevel(reto.difficultyId);

  const guestId = await currentGuestPlayerId();
  const [miResultado, clasificacion] = await Promise.all([
    guestId ? resultadoDelDia(guestId, dailyKey) : Promise.resolve(null),
    clasificacionDelDia(dailyKey, 10),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ApartmentPlaque
        vivienda={fechaLegible(dailyKey)}
        titulo="Reto del día"
        subtitulo="La misma partida para todo el portal"
        tono="granate"
      />

      <div className="mt-4">
        <GameShowBanner kicker="Hoy toca" titulo={reto.seedLabel} linea={reto.titular} tono="granate" />
      </div>

      <PaperNotice tono="papel" sujecion="cinta" className="mt-4 p-4 pt-5">
        <div className="flex flex-wrap gap-1.5">
          <Chip>{format.label}</Chip>
          <Chip>{format.estimatedMinutes}</Chip>
          <Chip>{totalQuestions(format)} preguntas</Chip>
          <Chip>Dificultad {nivel.label}</Chip>
          <Chip>{categoryLabel(reto.category)}</Chip>
          <Chip>Dificultad fija</Chip>
        </div>

        <p className="mt-3 text-sm text-tinta-suave">
          El reto se genera a partir de la fecha: no hay servidor que reparta preguntas, así que
          cualquiera que entre hoy juega exactamente esta partida. Mañana cambia.
        </p>

        {miResultado ? (
          <div className="mt-4 border-t border-linea pt-3">
            <p className="texto-sello text-tinta-tenue">Tu resultado de hoy</p>
            <p className="marcador text-3xl text-verde-portal">{miResultado.score}</p>
            <p className="text-sm text-tinta-suave">
              {miResultado.accuracy} % de aciertos ·{' '}
              {(miResultado.durationMs / 1000).toFixed(0)} s
            </p>
            <p className="mt-2">
              <LinkButton href={`/resultados/${miResultado.gameId}`} tone="papel" size="sm">
                Ver el acta
              </LinkButton>
            </p>
          </div>
        ) : (
          <form action={startDailyChallenge} className="mt-4">
            <button type="submit" className="btn btn-rojo btn-lg w-full">
              ▶ Jugar el reto de hoy
            </button>
            <p className="texto-sello mt-2 text-center text-tinta-tenue">
              Un intento por día. Sin registro.
            </p>
          </form>
        )}
      </PaperNotice>

      {/* Clasificación del día: la base de la de Fase 3 */}
      <section className="mt-6">
        <h2 className="text-xl">Tablón del día</h2>
        {clasificacion.length === 0 ? (
          <PaperNotice tono="papel" className="mt-3 p-4 text-sm text-tinta-suave">
            Todavía no hay nadie en el tablón de hoy. Puedes ser el primero.
          </PaperNotice>
        ) : (
          <ol className="mt-3 space-y-2">
            {clasificacion.map((entrada, indice) => {
              const nombre =
                entrada.guest.profile?.displayName ?? entrada.guest.displayName ?? 'Vecino anónimo';
              const esMio = miResultado?.id === entrada.id;
              return (
                <li key={entrada.id}>
                  <div
                    className={`papel flex items-center gap-3 p-3 ${esMio ? 'border-2 border-verde-portal' : ''}`}
                  >
                    <span className="marcador w-8 text-center text-xl">{indice + 1}</span>
                    <NeighbourAvatar
                      arquetipo={
                        (entrada.guest.profile?.arquetipo as 'presidente' | undefined) ?? 'presidente'
                      }
                      color={entrada.guest.profile?.colorAvatar ?? 'verde'}
                      tamano={40}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {nombre}
                        {esMio ? ' · tú' : ''}
                      </span>
                      <span className="texto-sello block text-[0.6rem] text-tinta-tenue">
                        {entrada.accuracy} % · {(entrada.durationMs / 1000).toFixed(0)} s
                      </span>
                    </span>
                    <span className="marcador text-xl text-verde-portal">{entrada.score}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <p className="texto-sello mt-2 text-tinta-tenue">
          En Fase 3 este tablón será compartido en tiempo real entre los vecinos de la sala.
        </p>
      </section>

      <p className="mt-6 flex flex-wrap gap-2">
        <LinkButton href="/desafio" tone="papel" size="sm">
          Jugar un desafío compartido
        </LinkButton>
        <LinkButton href="/" tone="fantasma" size="sm">
          ← Volver al portal
        </LinkButton>
      </p>
    </div>
  );
}
