'use client';

/**
 * El punto de conexión. Discreto pero honesto: si algo va mal el jugador tiene derecho a
 * saberlo antes de pensar que el juego le ha ignorado la respuesta.
 *
 * Nunca es solo color: lleva texto accesible y un símbolo distinto por estado, para que
 * funcione con daltonismo y con lector de pantalla.
 */

import type { EstadoConexion } from '@/lib/sala/transporte';

const ESTILOS: Record<EstadoConexion, { color: string; simbolo: string; texto: string }> = {
  'en-vivo': { color: 'bg-verde-portal', simbolo: '●', texto: 'En vivo' },
  sondeando: { color: 'bg-mostaza', simbolo: '◐', texto: 'Conexión lenta' },
  conectando: { color: 'bg-mostaza', simbolo: '◔', texto: 'Conectando…' },
  'sin-conexion': { color: 'bg-rojo-buzon', simbolo: '○', texto: 'Sin conexión' },
};

export function EstadoConexionPunto({ estado }: { estado: EstadoConexion }) {
  const estilo = ESTILOS[estado];
  const alarma = estado === 'sin-conexion';

  return (
    <div
      className="fixed left-3 top-3 z-40 flex items-center gap-2"
      role="status"
      aria-live={alarma ? 'assertive' : 'polite'}
    >
      <span
        aria-hidden
        className={`inline-block h-3 w-3 rounded-full ${estilo.color} ${alarma ? 'animate-pulse' : ''}`}
      />
      <span className={`texto-sello ${alarma ? 'text-rojo-buzon' : 'text-tinta-tenue'}`}>
        {alarma ? 'Estamos intentando volver al portal…' : estilo.texto}
      </span>
    </div>
  );
}
