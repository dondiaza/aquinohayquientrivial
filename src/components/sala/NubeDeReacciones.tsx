'use client';

/**
 * NUBE DE REACCIONES.
 *
 * Los emoji que mandan los móviles suben flotando por un lado de la pantalla grande. Tres
 * decisiones para que sea una gracia y no una plaga:
 *
 *   · **tope duro en pantalla** — nunca más de 12 a la vez, por muchos que lleguen;
 *   · **se agrupan** — si caen ocho aplausos seguidos se ve «👏 ×8», no ocho manos;
 *   · **respeta `prefers-reduced-motion`** — sin animación, se muestra un recuento discreto.
 *
 * El límite de ritmo de verdad está en el servidor (`saneado.ts`); esto es solo la parte
 * visual de no dejar que nadie tape la pregunta a base de pulsar.
 */

import { useEffect, useState } from 'react';

import type { EventoSala } from '@/domain/party/protocolo';
import { useReducedMotion } from '@/lib/motion';

const MAXIMO_EN_PANTALLA = 12;
const VIDA_MS = 3200;

type Burbuja = { clave: number; emoji: string; carril: number; nacida: number };

export function NubeDeReacciones({ eventos }: { eventos: readonly EventoSala[] }) {
  const [burbujas, setBurbujas] = useState<Burbuja[]>([]);
  const reducido = useReducedMotion();

  useEffect(() => {
    const nuevas = eventos.filter((evento) => evento.type === 'REACCION');
    if (nuevas.length === 0) return;

    setBurbujas((previas) => {
      const ahora = Date.now();
      const vivas = previas.filter((burbuja) => ahora - burbuja.nacida < VIDA_MS);
      const añadidas = nuevas.map((evento, indice) => ({
        clave: evento.seq * 100 + indice,
        emoji: String(evento.payload.emoji ?? '👏'),
        carril: (evento.seq + indice) % 5,
        nacida: ahora,
      }));
      return [...vivas, ...añadidas].slice(-MAXIMO_EN_PANTALLA);
    });
  }, [eventos]);

  useEffect(() => {
    if (burbujas.length === 0) return;
    const id = setInterval(() => {
      const ahora = Date.now();
      setBurbujas((previas) => previas.filter((burbuja) => ahora - burbuja.nacida < VIDA_MS));
    }, 500);
    return () => clearInterval(id);
  }, [burbujas.length]);

  if (burbujas.length === 0) return null;

  // Sin movimiento: un recuento agrupado y en paz.
  if (reducido) {
    const recuento = new Map<string, number>();
    for (const burbuja of burbujas) {
      recuento.set(burbuja.emoji, (recuento.get(burbuja.emoji) ?? 0) + 1);
    }
    return (
      <div className="fixed bottom-20 right-3 z-30 flex flex-col items-end gap-1" aria-hidden>
        {[...recuento.entries()].map(([emoji, cuantos]) => (
          <span key={emoji} className="papel px-2 py-1 text-xl">
            {emoji} ×{cuantos}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed bottom-0 right-4 z-30 h-80 w-32" aria-hidden>
      {burbujas.map((burbuja) => (
        <span
          key={burbuja.clave}
          className="anim-flotar absolute text-4xl"
          style={{ right: `${burbuja.carril * 20}px`, bottom: 0 }}
        >
          {burbuja.emoji}
        </span>
      ))}
    </div>
  );
}
