'use client';

import { useEffect, useState } from 'react';

/**
 * SISTEMA DE MOTION — las mismas cuatro velocidades que en CSS (`--dur-*`), disponibles
 * en JavaScript para los temporizadores de la coreografía (revelado, cartelas, sellos).
 *
 * Si cambias una duración, cámbiala en los dos sitios: aquí y en globals.css.
 */
export const DUR = {
  instantanea: 90,
  rapida: 200,
  media: 350,
  dramatica: 700,
  cartela: 1400,
} as const;

export type Velocidad = keyof typeof DUR;

/** Coreografía del revelado (§20): bloquear → pausa → marcar → puntos → explicación. */
export const REVEAL = {
  /** Pausa entre bloquear la respuesta y desvelar la correcta. */
  pausaAntesDeMarcar: 550,
  /** Cuánto tarda en aparecer el desglose de puntos. */
  puntos: 220,
  /** Auto-avance del revelado (el botón siempre permite ir antes). */
  autoAvanceSegundos: 7,
} as const;

/**
 * ¿El usuario ha pedido menos movimiento? Se consulta en cliente y se reevalúa si
 * cambia la preferencia del sistema. Los componentes lo usan para NO lanzar efectos
 * grandes (partículas, sacudidas, sellos) — el CSS ya desactiva las transiciones.
 */
export function useReducedMotion(): boolean {
  const [reducido, setReducido] = useState(false);

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducido(consulta.matches);
    const alCambiar = (evento: MediaQueryListEvent) => setReducido(evento.matches);
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  return reducido;
}

/** Vibración corta donde el dispositivo la soporte. Silenciosa si no. */
export function vibrar(patron: number | number[]): void {
  if (typeof navigator === 'undefined') return;
  if (!('vibrate' in navigator)) return;
  try {
    navigator.vibrate(patron);
  } catch {
    /* el navegador puede bloquearla; no es crítico */
  }
}

export const VIBRACION = {
  toque: 12,
  acierto: [18, 40, 24] as number[],
  fallo: [45, 30, 45] as number[],
  evento: [12, 60, 12, 60, 24] as number[],
} as const;
