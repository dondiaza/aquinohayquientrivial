import type { Metadata } from 'next';

import { LinkButton } from '@/components/ui/Button';
import { Chip, Nota, Papel, Placa } from '@/components/ui/Surfaces';
import { HOW_TO } from '@/domain/copy/ui';
import { STREAK_MILESTONES } from '@/domain/copy/streaks';
import { GAME_EVENT_LIST } from '@/domain/events/game-events';
import { DIFFICULTY_LEVELS } from '@/domain/difficulty/levels';
import { POWER_UP_LIST } from '@/domain/powerups/powerups';
import { QUESTION_TYPE_LIST } from '@/domain/questions/registry';
import { RANKS } from '@/domain/ranks/ranks';
import { SCORING } from '@/domain/scoring/scoring';

export const metadata: Metadata = { title: 'Cómo jugar' };

/**
 * Esta página se GENERA a partir del dominio (tipos de prueba, power-ups, eventos,
 * rangos y constantes de puntuación). Si mañana cambia una regla, la explicación
 * cambia con ella: no hay documentación que se quede desactualizada.
 */
export default function HowToPlayPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Placa className="px-5 py-5 pt-7">
        <h1 className="text-3xl sm:text-4xl">{HOW_TO.title}</h1>
      </Placa>
      <p className="mt-3 text-sm text-tinta-suave">{HOW_TO.subtitle}</p>

      <section className="mt-6">
        <h2 className="text-xl">En tres frases</h2>
        <Nota tone="papel" className="mt-3 p-4">
          <ol className="list-inside list-decimal space-y-1 text-sm">
            <li>Responde preguntas sobre la comunidad antes de que se acabe el tiempo.</li>
            <li>Acertar seguido sube la racha, y la racha sube los puntos.</li>
            <li>La última ronda es una apuesta: puedes ganar o perder lo que arriesgues.</li>
          </ol>
        </Nota>
      </section>

      <section className="mt-6">
        <h2 className="text-xl">Tipos de prueba</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {QUESTION_TYPE_LIST.map((type) => (
            <Papel key={type.type} className="p-3">
              <p className="texto-cartel">
                <span aria-hidden className="mr-1">
                  {type.icon}
                </span>
                {type.label}
              </p>
              <p className="mt-1 text-sm text-tinta-suave">{type.instruction}</p>
              <p className="mt-2 flex flex-wrap gap-1">
                <Chip>{type.defaultTimeLimitSeconds}s por defecto</Chip>
                <Chip>{type.defaultBasePoints} pts base</Chip>
                {type.supportsOptionElimination ? <Chip>admite descarte</Chip> : null}
                {type.supportsPartialCredit ? <Chip>acierto parcial</Chip> : null}
              </p>
            </Papel>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xl">Puntuación</h2>
        <Papel className="mt-3 p-4 text-sm">
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
              <strong>Tiempo:</strong> hasta {SCORING.timeBonusMax} puntos, repartidos en{' '}
              {SCORING.timeBonusBands} tramos. Se premia responder pronto, no responder 200 ms antes:
              la precisión pesa mucho más que los reflejos.
            </li>
            <li>
              <strong>Racha:</strong> {SCORING.streakBonusPerStep} puntos por acierto consecutivo,
              con un tope de {SCORING.streakBonusCap} (
              {SCORING.streakBonusPerStep * SCORING.streakBonusCap} puntos máximo).
            </li>
            <li>
              <strong>Dificultad:</strong> multiplicador entre ×
              {SCORING.difficultyMultiplierMin} y ×{SCORING.difficultyMultiplierMax} según la escala
              interna 1-10.
            </li>
            <li>
              <strong>Fallo:</strong> 0 puntos. En «ordena el desastre» hay acierto parcial: cuenta
              cada elemento bien colocado.
            </li>
            <li>
              <strong>Apuesta final:</strong> sumas lo apostado si aciertas y lo pierdes si fallas.
              El marcador nunca baja de cero.
            </li>
          </ul>
        </Papel>
      </section>

      <section className="mt-6">
        <h2 className="text-xl">Comodines</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {POWER_UP_LIST.map((powerUp) => (
            <Nota key={powerUp.id} tone="mostaza" className="p-3">
              <p className="texto-cartel">
                <span aria-hidden className="mr-1">
                  {powerUp.icon}
                </span>
                {powerUp.label}
              </p>
              <p className="mt-1 text-sm text-tinta-suave">{powerUp.description}</p>
              <Chip className="mt-2">{powerUp.defaultCharges} usos por partida</Chip>
            </Nota>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xl">Sucesos del portal</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {GAME_EVENT_LIST.map((event) => (
            <Papel key={event.id} className="p-3">
              <p className="texto-cartel">
                <span aria-hidden className="mr-1">
                  {event.icon}
                </span>
                {event.title}
              </p>
              <p className="mt-1 text-xs text-tinta-suave">{event.line}</p>
              <p className="texto-sello mt-2 text-rojo-buzon">{event.consequence}</p>
            </Papel>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="text-xl">Rachas</h2>
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
          <h2 className="text-xl">Rangos</h2>
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
        <h2 className="text-xl">Dificultad</h2>
        <p className="mt-2 max-w-prose text-sm text-tinta-suave">
          Internamente la dificultad es una escala de 1 a 10. Cada nivel elige su punto de partida y
          hasta dónde puede moverse la dificultad adaptativa: tras dos aciertos seguidos sube un
          poco, tras dos fallos baja. Nunca da saltos bruscos y se puede desactivar en el setup.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {DIFFICULTY_LEVELS.map((level) => (
            <li key={level.id}>
              <Chip title={level.tagline}>
                {level.label} · {level.min}-{level.max}
              </Chip>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <LinkButton href="/jugar/solo" size="lg" tone="rojo">
          ▶ Empezar una partida
        </LinkButton>
      </section>
    </div>
  );
}
