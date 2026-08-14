import type { Metadata } from 'next';

import { guardarPerfil } from './actions';
import { LinkButton } from '@/components/ui/Button';
import { Field, Select, TextInput } from '@/components/ui/Form';
import { Chip } from '@/components/ui/Surfaces';
import { ApartmentPlaque, PaperNotice } from '@/components/portal/Estructuras';
import { NeighbourAvatar } from '@/components/portal/Avatar';
import { CommunityStamp } from '@/components/portal/Estructuras';
import { RarityBadge } from '@/components/portal/Espectaculo';
import { LOGROS } from '@/domain/achievements/achievements';
import {
  ARQUETIPOS,
  COLORES_AVATAR,
  MARCOS,
  getArquetipo,
  marcosDisponibles,
} from '@/domain/players/avatar';
import {
  RANGOS,
  progresoDeRango,
  rangoPorId,
  siguienteRango,
} from '@/domain/progression/progression';
import { getDifficultyLevel } from '@/domain/difficulty/levels';
import { getGameFormat } from '@/domain/rounds/formats';
import { prisma } from '@/server/db';
import { obtenerPerfil } from '@/server/players/service';
import { currentGuestPlayerId } from '@/server/guest';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tu portal' };

/**
 * PERFIL — el ascensor del portal: quién eres, cuánto has subido y qué has conseguido.
 *
 * Todo cuelga de la cookie anónima; no hay cuentas. La personalización es original
 * (arquetipos genéricos de vecino, nunca personas reales) y los marcos se desbloquean
 * con el rango, así que la progresión se ve de un vistazo.
 */
export default async function ProfilePage() {
  const guestId = await currentGuestPlayerId();

  if (!guestId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <ApartmentPlaque vivienda="Ascensor" titulo="Todavía no vives aquí" tono="azul" />
        <PaperNotice tono="papel" className="mt-4 p-4">
          <p className="text-sm text-tinta-suave">
            Tu perfil se crea al jugar la primera partida. No hace falta registrarse: se guarda
            con una cookie anónima.
          </p>
        </PaperNotice>
        <p className="mt-4">
          <LinkButton href="/jugar/solo" tone="rojo">
            ▶ Jugar una partida
          </LinkButton>
        </p>
      </div>
    );
  }

  const perfil = await obtenerPerfil(guestId);
  const rango = rangoPorId(perfil.rangoId);
  const siguiente = siguienteRango(perfil.xp);
  const progreso = progresoDeRango(perfil.xp);
  const conseguidos = new Set(perfil.logros.map((logro) => logro.achievementId));

  const records = await prisma.personalBest.findMany({
    where: { guestId },
    orderBy: { score: 'desc' },
  });

  const precision =
    perfil.totalAnswers > 0
      ? Math.round((perfil.totalCorrect / perfil.totalAnswers) * 1000) / 10
      : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <ApartmentPlaque
        vivienda="Ficha de vecino"
        titulo={perfil.displayName ?? 'Vecino anónimo'}
        subtitulo={`${rango.label} · ${perfil.xp} XP`}
      />

      {/* ── Avatar y progreso ────────────────────────────────────────────────── */}
      <section className="mt-5 grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-2">
          <NeighbourAvatar
            arquetipo={perfil.arquetipo}
            color={perfil.colorAvatar}
            marco={perfil.marco}
            tamano={120}
            etiqueta={`Avatar: ${getArquetipo(perfil.arquetipo).label}`}
          />
          <p className="texto-sello text-tinta-tenue">{getArquetipo(perfil.arquetipo).label}</p>
        </div>

        <PaperNotice tono="papel" className="p-4">
          <p aria-hidden className="text-3xl">
            {rango.icon}
          </p>
          <p className="texto-cartel text-2xl">{rango.label}</p>
          <p className="text-sm text-tinta-suave">{rango.linea}</p>

          <div className="mt-3">
            <div className="barra-tiempo h-3">
              <span
                style={{ width: `${progreso * 100}%`, background: 'var(--color-verde-claro)' }}
              />
            </div>
            <p className="texto-sello mt-1 text-tinta-tenue">
              {siguiente
                ? `${perfil.xp} / ${siguiente.xp} XP hacia ${siguiente.label}`
                : 'Rango máximo alcanzado'}
            </p>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <dt className="texto-sello text-tinta-tenue">Partidas</dt>
              <dd className="marcador text-xl">{perfil.gamesFinished}</dd>
            </div>
            <div>
              <dt className="texto-sello text-tinta-tenue">Mejor marca</dt>
              <dd className="marcador text-xl">{perfil.bestScore}</dd>
            </div>
            <div>
              <dt className="texto-sello text-tinta-tenue">Mejor racha</dt>
              <dd className="marcador text-xl">{perfil.bestStreak}</dd>
            </div>
            <div>
              <dt className="texto-sello text-tinta-tenue">Precisión</dt>
              <dd className="marcador text-xl">{precision} %</dd>
            </div>
          </dl>
        </PaperNotice>
      </section>

      {/* ── Personalización ─────────────────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="text-xl">Personalizar</h2>
        <form action={guardarPerfil} className="papel mt-3 grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Cómo te llaman en el portal" htmlFor="displayName">
            <TextInput
              id="displayName"
              name="displayName"
              maxLength={24}
              defaultValue={perfil.displayName ?? ''}
              placeholder="Vecino/a del 3ºB"
            />
          </Field>

          <Field label="Arquetipo" htmlFor="arquetipo">
            <Select id="arquetipo" name="arquetipo" defaultValue={perfil.arquetipo}>
              {ARQUETIPOS.map((arquetipo) => (
                <option key={arquetipo.id} value={arquetipo.id}>
                  {arquetipo.label} — {arquetipo.linea}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Color" htmlFor="colorAvatar">
            <Select id="colorAvatar" name="colorAvatar" defaultValue={perfil.colorAvatar}>
              {COLORES_AVATAR.map((color) => (
                <option key={color.id} value={color.id}>
                  {color.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Marco"
            htmlFor="marco"
            hint={`Se desbloquean con el rango. Tienes ${marcosDisponibles(perfil.nivel).length} de ${MARCOS.length}.`}
          >
            <Select id="marco" name="marco" defaultValue={perfil.marco}>
              {MARCOS.map((marco) => (
                <option
                  key={marco.id}
                  value={marco.id}
                  disabled={marco.nivelMinimo > perfil.nivel}
                >
                  {marco.label}
                  {marco.nivelMinimo > perfil.nivel ? ` (nivel ${marco.nivelMinimo})` : ''}
                </option>
              ))}
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-verde">
              Guardar ficha
            </button>
          </div>
        </form>
      </section>

      {/* ── Logros ──────────────────────────────────────────────────────────── */}
      <section className="mt-6" id="logros">
        <h2 className="text-xl">
          Logros{' '}
          <span className="texto-sello text-tinta-tenue">
            {conseguidos.size}/{LOGROS.length}
          </span>
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {LOGROS.map((logro) => {
            const conseguido = conseguidos.has(logro.id);
            return (
              <li key={logro.id}>
                <div
                  className={`papel flex items-start gap-3 p-3 ${conseguido ? '' : 'opacity-60'}`}
                >
                  <span aria-hidden className="text-2xl">
                    {conseguido ? logro.icon : '🔒'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{logro.label}</span>
                    <span className="block text-xs text-tinta-suave">{logro.descripcion}</span>
                    <span className="mt-1 block">
                      <RarityBadge rareza={logro.rareza}>
                        {conseguido ? 'Conseguido' : 'Pendiente'}
                      </RarityBadge>
                    </span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Récords ─────────────────────────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="text-xl">Tus récords</h2>
        {records.length === 0 ? (
          <PaperNotice tono="papel" className="mt-3 p-4 text-sm text-tinta-suave">
            Todavía no hay récords. El primero llega al terminar una partida.
          </PaperNotice>
        ) : (
          <ul className="mt-3 space-y-2">
            {records.map((record) => (
              <li key={record.id}>
                <div className="papel flex flex-wrap items-center justify-between gap-3 p-3">
                  <span>
                    <span className="texto-cartel block">
                      {getGameFormat(record.formatId).label}
                    </span>
                    <span className="texto-sello text-tinta-tenue">
                      {getDifficultyLevel(record.difficultyId).label} · racha {record.bestStreak} ·{' '}
                      {record.accuracy} %
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="marcador text-2xl text-verde-portal">{record.score}</span>
                    <LinkButton href={`/resultados/${record.gameId}`} tone="papel" size="sm">
                      Acta
                    </LinkButton>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="texto-sello mt-2 text-tinta-tenue">
          Tu récord de cada formato es el fantasma contra el que compites durante la partida.
        </p>
      </section>

      {/* ── Escalera de rangos ──────────────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="text-xl">La escalera</h2>
        <ol className="mt-3 flex flex-wrap gap-2">
          {RANGOS.map((candidato) => (
            <li key={candidato.id}>
              <Chip
                className={
                  perfil.xp >= candidato.xp
                    ? 'border-verde-portal text-verde-portal'
                    : 'text-tinta-tenue'
                }
              >
                <span aria-hidden>{candidato.icon}</span> {candidato.label} · {candidato.xp} XP
              </Chip>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {conseguidos.size > 0 ? (
          <CommunityStamp
            titulo={`${conseguidos.size} logros`}
            linea="registrados"
            rareza={conseguidos.size >= 8 ? 'legendario' : conseguidos.size >= 4 ? 'raro' : 'curioso'}
          />
        ) : null}
        <LinkButton href="/jugar/solo" tone="rojo">
          ▶ Jugar otra
        </LinkButton>
        <LinkButton href="/" tone="fantasma" size="sm">
          ← Volver al portal
        </LinkButton>
      </div>
    </div>
  );
}
