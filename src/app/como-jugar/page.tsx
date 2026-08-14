import type { Metadata } from 'next';

import { LinkButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Surfaces';
import { ApartmentPlaque, PaperNotice } from '@/components/portal/Estructuras';
import { RarityBadge } from '@/components/portal/Espectaculo';
import { HOW_TO } from '@/domain/copy/ui';
import { STREAK_MILESTONES } from '@/domain/copy/streaks';
import { GAME_EVENT_LIST } from '@/domain/events/game-events';
import { DIRECTOR } from '@/domain/events/director';
import { DIFFICULTY_LEVELS } from '@/domain/difficulty/levels';
import { MAX_COMODINES_POR_PREGUNTA, POWER_UP_LIST } from '@/domain/powerups/powerups';
import { QUESTION_TYPE_LIST } from '@/domain/questions/registry';
import { RANKS } from '@/domain/ranks/ranks';
import { RANGOS } from '@/domain/progression/progression';
import { ROUND_FAMILIES } from '@/domain/rounds/formats';
import { SCORING } from '@/domain/scoring/scoring';

export const metadata: Metadata = { title: 'Cómo jugar' };

/**
 * Esta página se GENERA a partir del dominio (tipos de prueba, rondas, power-ups,
 * sucesos, rangos y constantes de puntuación). Si mañana cambia una regla, la
 * explicación cambia con ella: no hay documentación que se quede desactualizada.
 */
export default function HowToPlayPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <ApartmentPlaque vivienda="Normas de la comunidad" titulo={HOW_TO.title} subtitulo={HOW_TO.subtitle} />

      <section className="mt-6">
        <h2 className="text-xl">En tres frases</h2>
        <PaperNotice tono="papel" className="mt-3 p-4">
          <ol className="list-inside list-decimal space-y-1 text-sm">
            <li>Responde sobre la comunidad antes de que se acabe el tiempo.</li>
            <li>Acertar seguido sube el combo, y el combo sube los puntos.</li>
            <li>La última ronda es una apuesta: puedes ganar o perder lo que arriesgues.</li>
          </ol>
        </PaperNotice>
      </section>

      {/* ── Familias de prueba ─────────────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="text-xl">
          Las {QUESTION_TYPE_LIST.length} familias de prueba
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {QUESTION_TYPE_LIST.map((type) => (
            <div key={type.type} className="papel p-3">
              <p className="texto-cartel">
                <span aria-hidden className="mr-1">
                  {type.icon}
                </span>
                {type.label}
              </p>
              <p className="mt-1 text-sm text-tinta-suave">{type.instruction}</p>
              <p className="mt-2 flex flex-wrap gap-1">
                <Chip>{type.defaultTimeLimitSeconds}s</Chip>
                <Chip>{type.defaultBasePoints} pts</Chip>
                {type.supportsOptionElimination ? <Chip>admite descarte</Chip> : null}
                {type.supportsPartialCredit ? <Chip>acierto parcial</Chip> : null}
                {type.hasStudyPhase ? <Chip>fase de memoria</Chip> : null}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Rondas ─────────────────────────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="text-xl">Las rondas</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ROUND_FAMILIES.map((round) => (
            <div key={round.id} className="papel p-3">
              <p className="texto-cartel text-sm">
                <span aria-hidden className="mr-1">
                  {round.icon}
                </span>
                {round.title}
              </p>
              <p className="mt-1 text-xs text-tinta-suave">{round.rule ?? round.subtitle}</p>
              <p className="mt-2 flex flex-wrap gap-1">
                {(round.modifiers ?? []).map((modifier) => (
                  <Chip key={modifier.id}>×{modifier.multiplier}</Chip>
                ))}
                {round.timeScale && round.timeScale !== 1 ? (
                  <Chip>tiempo ×{round.timeScale}</Chip>
                ) : null}
                {round.presentation && round.presentation !== 'normal' ? (
                  <Chip>{round.presentation}</Chip>
                ) : null}
                {round.progressStyle === 'ascensor' ? <Chip>ascensor</Chip> : null}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Puntuación ─────────────────────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="text-xl">Puntuación</h2>
        <div className="papel mt-3 p-4 text-sm">
          <p className="font-mono text-xs sm:text-sm">
            puntos = (base × precisión + bonus de tiempo + bonus de racha) × dificultad ×
            modificadores
          </p>
          <ul className="mt-3 space-y-1">
            <li>
              <strong>Acierto:</strong> {SCORING.defaultBasePoints} puntos base (cada pregunta puede
              definir los suyos).
            </li>
            <li>
              <strong>Tiempo:</strong> hasta {SCORING.timeBonusMax} puntos en{' '}
              {SCORING.timeBonusBands} tramos. Se premia responder pronto, no responder 200 ms antes.
            </li>
            <li>
              <strong>Racha:</strong> {SCORING.streakBonusPerStep} puntos por acierto consecutivo,
              con tope de {SCORING.streakBonusCap}, más el bonus del hito.
            </li>
            <li>
              <strong>Dificultad:</strong> de ×{SCORING.difficultyMultiplierMin} a ×
              {SCORING.difficultyMultiplierMax} según la escala interna 1-10.
            </li>
            <li>
              <strong>Fallo:</strong> 0 puntos. Hay acierto parcial en «ordena el desastre», «la
              junta» y «portero automático».
            </li>
            <li>
              <strong>Apuestas:</strong> sumas lo apostado si aciertas y lo pierdes si fallas. El
              marcador nunca baja de cero.
            </li>
          </ul>
        </div>
      </section>

      {/* ── Comodines ──────────────────────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="text-xl">Comodines</h2>
        <p className="texto-sello mt-1 text-tinta-tenue">
          Como máximo {MAX_COMODINES_POR_PREGUNTA} por pregunta
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {POWER_UP_LIST.map((powerUp) => (
            <PaperNotice key={powerUp.id} tono="mostaza" className="p-3">
              <p className="texto-cartel">
                <span aria-hidden className="mr-1">
                  {powerUp.icon}
                </span>
                {powerUp.label}
              </p>
              <p className="mt-1 text-sm text-tinta-suave">{powerUp.description}</p>
              <p className="mt-2 flex flex-wrap gap-1">
                <Chip>{powerUp.defaultCharges} usos</Chip>
                <RarityBadge rareza={powerUp.rareza}>{powerUp.rareza}</RarityBadge>
              </p>
            </PaperNotice>
          ))}
        </div>
      </section>

      {/* ── Sucesos y director ─────────────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="text-xl">Sucesos del portal</h2>
        <p className="mt-1 max-w-prose text-sm text-tinta-suave">
          No salen al azar: hay un director de partida que mira cómo vas. Nunca antes de la
          pregunta {DIRECTOR.primeraPreguntaConSucesos + 1}, nunca dos seguidos (mínimo{' '}
          {DIRECTOR.enfriamiento} preguntas de separación) y los sucesos con castigo solo aparecen
          si vas bien. Si estás atascado, salen los que ayudan.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {GAME_EVENT_LIST.map((event) => (
            <div key={event.id} className="papel p-3">
              <p className="texto-cartel text-sm">
                <span aria-hidden className="mr-1">
                  {event.icon}
                </span>
                {event.title}
              </p>
              <p className="mt-1 text-xs text-tinta-suave">{event.line}</p>
              <p className="texto-sello mt-2 text-rojo-buzon">{event.consequence}</p>
              <p className="mt-2">
                <RarityBadge rareza={event.rareza}>{event.rareza}</RarityBadge>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Combos, rangos y progresión ────────────────────────────────────── */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="text-xl">Combos y rachas</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {STREAK_MILESTONES.map((milestone) => (
              <li key={milestone.at} className="flex items-baseline gap-2">
                <span className="chip">{milestone.at}</span>
                <span>
                  <strong>{milestone.title}</strong>
                  {milestone.bonus > 0 ? (
                    <span className="text-tinta-suave"> · +{milestone.bonus} pts</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xl">Rango de la partida</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {RANKS.map((rank) => (
              <li key={rank.id} className="flex items-baseline gap-2">
                <span aria-hidden>{rank.icon}</span>
                <span>
                  <strong>{rank.label}</strong>{' '}
                  <span className="text-tinta-suave">
                    desde {Math.round(rank.minIndex * 100)} % de rendimiento
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xl">La escalera de vecindad</h2>
        <p className="mt-1 max-w-prose text-sm text-tinta-suave">
          Además del rango de cada partida, hay una progresión propia: la experiencia premia
          terminar partidas, la precisión, la dificultad y la variedad de pruebas. Repetir la
          partida más corta en el nivel más fácil apenas da experiencia.
        </p>
        <ol className="mt-3 flex flex-wrap gap-2">
          {RANGOS.map((rango) => (
            <li key={rango.id}>
              <Chip>
                <span aria-hidden>{rango.icon}</span> {rango.label} · {rango.xp} XP
              </Chip>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6">
        <h2 className="text-xl">Dificultad, retos y fantasma</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <PaperNotice tono="papel" className="p-3 text-sm">
            <p className="texto-cartel text-sm">Dificultad adaptativa</p>
            <p className="mt-1 text-tinta-suave">
              Tras dos aciertos sube un poco; tras dos fallos baja. Siempre dentro de los límites
              del nivel elegido y se puede desactivar.
            </p>
            <p className="mt-2 flex flex-wrap gap-1">
              {DIFFICULTY_LEVELS.map((level) => (
                <Chip key={level.id}>
                  {level.label} {level.min}-{level.max}
                </Chip>
              ))}
            </p>
          </PaperNotice>

          <PaperNotice tono="papel" className="p-3 text-sm">
            <p className="texto-cartel text-sm">Reto del día y desafíos</p>
            <p className="mt-1 text-tinta-suave">
              El reto del día es igual para todo el mundo y cambia a medianoche. Un desafío es una
              etiqueta compartible: quien la use juega tu misma partida.
            </p>
          </PaperNotice>

          <PaperNotice tono="papel" className="p-3 text-sm">
            <p className="texto-cartel text-sm">Modo fantasma</p>
            <p className="mt-1 text-tinta-suave">
              Durante la partida verás cuántos puntos llevaba tu récord a estas alturas. No revela
              nada de las preguntas: solo el marcador.
            </p>
          </PaperNotice>
        </div>
      </section>

      <section className="mt-8 flex flex-wrap gap-2">
        <LinkButton href="/jugar/solo" size="lg" tone="rojo">
          ▶ Empezar una partida
        </LinkButton>
        <LinkButton href="/reto" tone="papel">
          Reto del día
        </LinkButton>
      </section>
    </div>
  );
}
