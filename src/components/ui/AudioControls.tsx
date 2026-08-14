'use client';

import { useState } from 'react';

import { useAudio } from '@/lib/audio/AudioProvider';

/**
 * Control de sonido: silencio, volumen y ambiente. Vive en la cabecera.
 *
 * Accesibilidad: el estado se comunica con icono + texto (no solo color), el desplegable
 * es navegable con teclado y el botón anuncia su estado con `aria-pressed`.
 */
export function AudioControls() {
  const { ajustes, actualizar } = useAudio();
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="texto-sello flex items-center gap-1 border-2 border-transparent px-2 py-1.5 text-verde-portal hover:border-verde-portal hover:bg-papel"
        aria-expanded={abierto}
        aria-pressed={!ajustes.silencio}
        onClick={() => setAbierto((valor) => !valor)}
        title="Sonido"
      >
        <span aria-hidden>{ajustes.silencio ? '🔇' : ajustes.volumen > 0.5 ? '🔊' : '🔉'}</span>
        <span className="hidden sm:inline">{ajustes.silencio ? 'Sin sonido' : 'Sonido'}</span>
      </button>

      {abierto ? (
        <div
          className="papel anim-aparecer absolute right-0 z-40 mt-1 w-60 space-y-3 p-3"
          role="group"
          aria-label="Ajustes de sonido"
        >
          <button
            type="button"
            className={`btn btn-sm w-full ${ajustes.silencio ? 'btn-papel' : 'btn-verde'}`}
            onClick={() => actualizar({ silencio: !ajustes.silencio })}
          >
            {ajustes.silencio ? '🔇 Activar sonido' : '🔊 Silenciar'}
          </button>

          <div>
            <label className="etiqueta" htmlFor="volumen-audio">
              Volumen {Math.round(ajustes.volumen * 100)} %
            </label>
            <input
              id="volumen-audio"
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(ajustes.volumen * 100)}
              onChange={(evento) =>
                actualizar({ volumen: Number.parseInt(evento.target.value, 10) / 100 })
              }
              className="w-full accent-verde-portal"
              disabled={ajustes.silencio}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-xs">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 flex-none accent-verde-portal"
              checked={ajustes.ambiente}
              onChange={(evento) => actualizar({ ambiente: evento.target.checked })}
              disabled={ajustes.silencio}
            />
            <span>
              <span className="block font-semibold">Ambiente del portal</span>
              <span className="block text-tinta-tenue">Zumbido muy suave de fondo</span>
            </span>
          </label>

          <p className="text-[0.65rem] text-tinta-tenue">
            Todos los sonidos son originales: se generan en tu navegador, no se descarga
            ningún audio.
          </p>
        </div>
      ) : null}
    </div>
  );
}
