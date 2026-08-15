'use client';

/**
 * CREAR SALA — el primer paso del host.
 *
 * Un formulario corto y un botón enorme. Todo lo demás (equipos, modo presentador, entrada
 * tardía) se puede cambiar luego desde el lobby, así que aquí no se pregunta: quien enchufa
 * el portátil a la tele quiere ver un código en pantalla, no un panel de configuración.
 *
 * El token de host se guarda en `localStorage` ANTES de navegar. Si se perdiera, la pantalla
 * seguiría funcionando como espectador pero sin controles, que es exactamente lo que debe
 * pasar: sin token no se manda en la sala.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DIFFICULTY_LEVELS } from '@/domain/difficulty/levels';
import { CATEGORY_MIX, QUESTION_CATEGORIES } from '@/domain/questions/categories';
import { GAME_FORMATS, totalQuestions } from '@/domain/rounds/formats';
import { almacen } from '@/lib/sala/useSala';

export function CrearSala() {
  const router = useRouter();
  const [formatId, setFormatId] = useState('normal');
  const [difficultyId, setDifficultyId] = useState('vecino');
  const [category, setCategory] = useState<string>(CATEGORY_MIX);
  const [sinSpoilers, setSinSpoilers] = useState(false);
  const [teamMode, setTeamMode] = useState<'NINGUNO' | 'COMPARTIDO' | 'INDIVIDUAL'>('NINGUNO');
  const [equipos, setEquipos] = useState(2);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = async (): Promise<void> => {
    setCreando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/salas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          setup: { formatId, difficultyId, category, sinSpoilers, adaptiveDifficulty: false },
          teamMode,
          equipos,
        }),
      });
      const datos = (await respuesta.json()) as
        | { ok: true; code: string; hostToken: string }
        | { ok: false; mensaje: string };

      if (!datos.ok) {
        setError(datos.mensaje);
        setCreando(false);
        return;
      }

      almacen.guardarHost(datos.code, datos.hostToken);
      router.push(`/host/${datos.code}`);
    } catch {
      setError('No se ha podido abrir la sala. Revisa la conexión.');
      setCreando(false);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg">Duración</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {GAME_FORMATS.map((formato) => (
            <button
              key={formato.id}
              type="button"
              className={`papel p-3 text-left ${formatId === formato.id ? 'ring-4 ring-verde-portal' : ''}`}
              onClick={() => setFormatId(formato.id)}
              aria-pressed={formatId === formato.id}
            >
              <span className="texto-cartel block text-lg">{formato.label}</span>
              <span className="texto-sello block text-tinta-tenue">
                {formato.estimatedMinutes} · {totalQuestions(formato)} preguntas
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg">Dificultad</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {DIFFICULTY_LEVELS.map((nivel) => (
            <button
              key={nivel.id}
              type="button"
              className={`papel p-3 text-left ${difficultyId === nivel.id ? 'ring-4 ring-verde-portal' : ''}`}
              onClick={() => setDifficultyId(nivel.id)}
              aria-pressed={difficultyId === nivel.id}
            >
              <span className="texto-cartel block">{nivel.label}</span>
              <span className="texto-sello block text-tinta-tenue">{nivel.tagline}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg">Temática</h2>
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            type="button"
            className={category === CATEGORY_MIX ? 'chip chip-activo' : 'chip'}
            onClick={() => setCategory(CATEGORY_MIX)}
          >
            Mezcla total
          </button>
          {QUESTION_CATEGORIES.map((categoria) => (
            <button
              key={categoria.id}
              type="button"
              className={category === categoria.id ? 'chip chip-activo' : 'chip'}
              onClick={() => setCategory(categoria.id)}
            >
              {categoria.icon} {categoria.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg">Equipos</h2>
        <div className="mt-2 flex flex-wrap gap-1">
          {(
            [
              ['NINGUNO', 'Cada uno a lo suyo'],
              ['INDIVIDUAL', 'Por puertas, cada uno con su móvil'],
              ['COMPARTIDO', 'Un móvil por puerta'],
            ] as const
          ).map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              className={teamMode === valor ? 'chip chip-activo' : 'chip'}
              onClick={() => setTeamMode(valor)}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        {teamMode !== 'NINGUNO' ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-tinta-suave">
            <span>¿Cuántas puertas?</span>
            {[2, 3, 4].map((cuantos) => (
              <button
                key={cuantos}
                type="button"
                className={equipos === cuantos ? 'chip chip-activo' : 'chip'}
                onClick={() => setEquipos(cuantos)}
              >
                {cuantos}
              </button>
            ))}
          </p>
        ) : null}
      </section>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={sinSpoilers}
          onChange={(evento) => setSinSpoilers(evento.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="block">Modo sin spoilers</span>
          <span className="block text-tinta-tenue">
            Fuera lo que destripa la serie: muertes, bodas decisivas y final de la quinta.
          </span>
        </span>
      </label>

      {error ? <p className="text-sm text-rojo-buzon">{error}</p> : null}

      <button
        type="button"
        className="btn btn-rojo btn-xl w-full"
        onClick={() => void crear()}
        disabled={creando}
      >
        {creando ? 'Abriendo el portal…' : '▶ Abrir la sala'}
      </button>

      <p className="text-xs text-tinta-tenue">
        Se abrirá una pantalla con el código y un QR. Los demás entran con el móvil desde{' '}
        <code>/unirse</code>. No hace falta instalar nada ni registrarse.
      </p>
    </div>
  );
}
