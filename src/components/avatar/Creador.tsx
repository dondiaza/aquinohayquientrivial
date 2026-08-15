'use client';

/**
 * CREADOR DE VECINO.
 *
 * Reglas que se han seguido, y que son el motivo de que esto no sea un formulario:
 *
 *  · **El resultado siempre a la vista.** El vecino se queda pegado arriba mientras se
 *    elige. Cambiar el pelo y no ver el pelo es lo que hace que la gente abandone.
 *  · **Cada toque cambia algo YA.** Sin guardar, sin previsualizar, sin confirmar. Se guarda
 *    al final, y hasta entonces todo es reversible.
 *  · **«Al azar» primero.** La pantalla arranca con un vecino ya hecho, no con un maniquí
 *    gris: se puede salir de aquí en tres segundos pulsando «Listo».
 *  · Deshacer de verdad, porque se toca mucho y se acierta poco a la primera.
 */

import { useCallback, useMemo, useRef, useState, useTransition } from 'react';

import { Vecino } from './Vecino';
import { Button } from '@/components/ui/Button';
import {
  ACCESORIOS,
  ALTURAS,
  BOCAS,
  CARAS,
  CEJAS,
  COLORES_PELO,
  COLORES_ROPA,
  COMBINACIONES,
  CUERPOS,
  FONDOS,
  MARCOS,
  NARICES,
  OJOS,
  PELOS,
  ROPAS,
  TONOS_PIEL,
  avatarAleatorio,
  type AvatarConfig,
} from '@/domain/avatar/config';

type Clave = keyof AvatarConfig;
type Pieza = { id: string; label: string; hex?: string };

type Grupo = {
  id: string;
  label: string;
  icono: string;
  campos: { clave: Clave; label: string; opciones: readonly Pieza[]; color?: boolean }[];
};

const GRUPOS: Grupo[] = [
  {
    id: 'cara',
    label: 'Cara',
    icono: '🙂',
    campos: [
      { clave: 'cara', label: 'Forma', opciones: CARAS },
      { clave: 'piel', label: 'Tono', opciones: TONOS_PIEL, color: true },
      { clave: 'ojos', label: 'Ojos', opciones: OJOS },
      { clave: 'cejas', label: 'Cejas', opciones: CEJAS },
      { clave: 'nariz', label: 'Nariz', opciones: NARICES },
      { clave: 'boca', label: 'Boca', opciones: BOCAS },
    ],
  },
  {
    id: 'pelo',
    label: 'Pelo',
    icono: '💇',
    campos: [
      { clave: 'pelo', label: 'Corte', opciones: PELOS },
      { clave: 'colorPelo', label: 'Color', opciones: COLORES_PELO, color: true },
    ],
  },
  {
    id: 'cuerpo',
    label: 'Cuerpo',
    icono: '🧍',
    campos: [
      { clave: 'cuerpo', label: 'Constitución', opciones: CUERPOS },
      { clave: 'altura', label: 'Altura', opciones: ALTURAS },
    ],
  },
  {
    id: 'ropa',
    label: 'Ropa',
    icono: '👕',
    campos: [
      { clave: 'ropa', label: 'Prenda', opciones: ROPAS },
      { clave: 'colorRopa', label: 'Color', opciones: COLORES_ROPA, color: true },
      { clave: 'accesorio', label: 'Accesorio', opciones: ACCESORIOS },
    ],
  },
  {
    id: 'fondo',
    label: 'Fondo',
    icono: '🏢',
    campos: [
      { clave: 'fondo', label: 'Dónde estás', opciones: FONDOS, color: true },
      { clave: 'marco', label: 'Marco', opciones: MARCOS },
    ],
  },
];

export function CreadorDeVecino({
  inicial,
  autenticado,
}: {
  inicial: AvatarConfig;
  autenticado: boolean;
}) {
  const [config, setConfig] = useState<AvatarConfig>(inicial);
  const [grupo, setGrupo] = useState<string>('cara');
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, empezar] = useTransition();
  const historial = useRef<AvatarConfig[]>([]);

  const activo = useMemo(() => GRUPOS.find((entrada) => entrada.id === grupo) ?? GRUPOS[0]!, [grupo]);

  const cambiar = useCallback((clave: Clave, valor: string) => {
    setGuardado(false);
    setConfig((previo) => {
      if (previo[clave] === valor) return previo;
      historial.current = [...historial.current.slice(-29), previo];
      return { ...previo, [clave]: valor };
    });
  }, []);

  const alAzar = useCallback(() => {
    setGuardado(false);
    setConfig((previo) => {
      historial.current = [...historial.current.slice(-29), previo];
      // El marco se respeta: normalmente es algo desbloqueado, no una tirada de dados.
      return { ...avatarAleatorio(), marco: previo.marco };
    });
  }, []);

  const deshacer = useCallback(() => {
    const anterior = historial.current.pop();
    if (anterior) {
      setGuardado(false);
      setConfig(anterior);
    }
  }, []);

  const guardar = () => {
    setError(null);
    empezar(async () => {
      try {
        const respuesta = await fetch('/api/avatar', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(config),
        });
        if (!respuesta.ok) {
          const cuerpo: unknown = await respuesta.json().catch(() => null);
          const mensaje =
            cuerpo && typeof cuerpo === 'object' && 'error' in cuerpo
              ? String((cuerpo as { error: unknown }).error)
              : 'No se ha podido guardar. Inténtalo otra vez.';
          setError(mensaje);
          return;
        }
        setGuardado(true);
        window.dispatchEvent(
          new CustomEvent('ahqv:analitica', { detail: { evento: 'AVATAR_SAVED' } }),
        );
      } catch {
        setError('Sin conexión. Tu vecino sigue aquí; vuelve a intentarlo.');
      }
    });
  };

  return (
    <div className="pb-32">
      {/* El vecino, siempre visible. */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b-2 border-tinta bg-papel/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <Vecino config={config} tamano={112} titulo="Tu vecino" />
          <div className="min-w-0 flex-1">
            <p className="texto-cartel text-lg">Tu vecino</p>
            <p className="text-sm text-tinta-suave">
              {COMBINACIONES.toLocaleString('es-ES')} combinaciones. Ninguna es la de nadie real.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" tone="mostaza" size="sm" onClick={alAzar}>
                🎲 Al azar
              </Button>
              <Button
                type="button"
                tone="fantasma"
                size="sm"
                onClick={deshacer}
                disabled={historial.current.length === 0}
              >
                ↩ Deshacer
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4">
        {/* Grupos. */}
        <nav className="flex flex-wrap gap-1" aria-label="Partes del vecino">
          {GRUPOS.map((entrada) => (
            <button
              key={entrada.id}
              type="button"
              onClick={() => setGrupo(entrada.id)}
              className={grupo === entrada.id ? 'chip chip-activo' : 'chip'}
              aria-pressed={grupo === entrada.id}
            >
              <span aria-hidden>{entrada.icono}</span> {entrada.label}
            </button>
          ))}
        </nav>

        {/* Piezas del grupo activo. */}
        <div className="mt-4 space-y-5">
          {activo.campos.map((campo) => (
            <fieldset key={campo.clave}>
              <legend className="texto-sello text-tinta-tenue">{campo.label}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {campo.opciones.map((opcion) => {
                  const elegida = config[campo.clave] === opcion.id;
                  return (
                    <button
                      key={opcion.id}
                      type="button"
                      onClick={() => cambiar(campo.clave, opcion.id)}
                      aria-pressed={elegida}
                      title={opcion.label}
                      className={`flex min-h-11 items-center gap-2 rounded-md border-2 px-3 py-1.5 text-sm transition ${
                        elegida
                          ? 'border-tinta bg-verde-portal text-papel'
                          : 'border-linea bg-papel hover:border-tinta'
                      }`}
                    >
                      {campo.color && opcion.hex ? (
                        <span
                          aria-hidden
                          className="inline-block h-5 w-5 rounded-full border border-tinta"
                          style={{ background: opcion.hex }}
                        />
                      ) : null}
                      {opcion.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-md border-2 border-rojo-buzon bg-papel p-3 text-sm">
            {error}
          </p>
        ) : null}
      </div>

      {/* Guardar, anclado abajo: en el móvil el botón importante no se va de la pantalla. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-tinta bg-papel/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <p className="min-w-0 flex-1 text-sm text-tinta-suave">
            {guardado
              ? '✓ Guardado. Ya eres tú en todas partes.'
              : autenticado
                ? 'Se guarda en tu cuenta.'
                : 'Se guarda en este dispositivo. Regístrate para llevártelo.'}
          </p>
          <Button type="button" tone="rojo" onClick={guardar} disabled={enviando}>
            {enviando ? 'Guardando…' : guardado ? 'Guardado ✓' : 'Listo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
