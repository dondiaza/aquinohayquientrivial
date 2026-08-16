'use client';

/**
 * RECOLECTOR DE EVENTOS — el oyente que no había.
 *
 * `ahqv:analitica` se emitía desde el botón de compartir y desde el creador de vecino, y no
 * lo escuchaba absolutamente nadie. Eventos disparados al aire, dando la sensación de que
 * había métricas cuando no había ninguna.
 *
 * Esto los recoge y los manda agrupados. Tres decisiones:
 *
 *   · **Se agrupa antes de enviar.** Un `fetch` por evento en mitad de una partida compite
 *     con las peticiones que sí importan. Se acumulan y salen cada pocos segundos.
 *   · **`sendBeacon` al cerrar.** Es lo único que sobrevive a que alguien cierre la pestaña,
 *     y cerrar la pestaña es justo el momento que más interesa medir.
 *   · **Nada personal.** Solo el nombre del evento y un puñado de datos numéricos. Ni
 *     identificadores de usuario, ni rutas con códigos de sala, ni nombres.
 */

import { useEffect } from 'react';

const INTERVALO_MS = 5_000;
const TOPE_COLA = 25;

type Evento = { evento: string; datos?: Record<string, string | number | boolean>; en: number };

export function Recolector() {
  useEffect(() => {
    let cola: Evento[] = [];
    let temporizador: ReturnType<typeof setTimeout> | null = null;

    const enviar = (conBeacon = false): void => {
      if (cola.length === 0) return;
      const lote = cola;
      cola = [];
      const cuerpo = JSON.stringify({ eventos: lote });

      if (conBeacon && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon('/api/analitica', new Blob([cuerpo], { type: 'application/json' }));
        return;
      }
      void fetch('/api/analitica', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: cuerpo,
        keepalive: true,
      }).catch(() => {
        // Perder una métrica no es motivo para molestar a nadie.
      });
    };

    const programar = (): void => {
      if (temporizador) return;
      temporizador = setTimeout(() => {
        temporizador = null;
        enviar();
      }, INTERVALO_MS);
    };

    const alEvento = (evento: Event): void => {
      const detalle = (evento as CustomEvent).detail as
        | { evento?: string; datos?: Record<string, string | number | boolean> }
        | undefined;
      if (!detalle?.evento) return;

      cola.push({ evento: detalle.evento, datos: detalle.datos, en: Date.now() });
      if (cola.length >= TOPE_COLA) enviar();
      else programar();
    };

    const alOcultar = (): void => {
      if (document.visibilityState === 'hidden') enviar(true);
    };

    window.addEventListener('ahqv:analitica', alEvento);
    document.addEventListener('visibilitychange', alOcultar);

    return () => {
      window.removeEventListener('ahqv:analitica', alEvento);
      document.removeEventListener('visibilitychange', alOcultar);
      if (temporizador) clearTimeout(temporizador);
      enviar(true);
    };
  }, []);

  return null;
}

/** Atajo para emitir desde cualquier componente sin repetir el `CustomEvent`. */
export function anotar(
  evento: string,
  datos?: Record<string, string | number | boolean>,
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('ahqv:analitica', { detail: { evento, datos } }));
}
