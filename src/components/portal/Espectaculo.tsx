'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { DUR, useReducedMotion } from '@/lib/motion';

// ── Marco de televisión de los 2000 ──────────────────────────────────────────

export function TVFrame({
  children,
  canal,
  className = '',
}: {
  children: ReactNode;
  /** Rótulo de canal, arriba a la derecha. */
  canal?: string;
  className?: string;
}) {
  return (
    <div className={`tv ${className}`}>
      <div className="crt relative min-h-24 p-4">
        {canal ? (
          <span className="texto-sello absolute right-3 top-2 z-10 text-[0.6rem] opacity-70">
            {canal}
          </span>
        ) : null}
        <div className="relative z-10">{children}</div>
      </div>
      {/* Rejilla del altavoz */}
      <div aria-hidden className="mt-2 flex items-center justify-between px-1">
        <span className="flex gap-1">
          {Array.from({ length: 8 }, (_, indice) => (
            <span key={indice} className="h-1 w-1 rounded-full bg-black/40" />
          ))}
        </span>
        <span className="h-2 w-2 rounded-full bg-rojo-buzon/80" />
      </div>
    </div>
  );
}

// ── Rótulo de concurso ───────────────────────────────────────────────────────

export function GameShowBanner({
  kicker,
  titulo,
  linea,
  tono = 'mostaza',
  className = '',
}: {
  kicker?: string;
  titulo: string;
  linea?: string;
  tono?: 'mostaza' | 'granate' | 'morado' | 'verde';
  className?: string;
}) {
  const fondo =
    tono === 'granate'
      ? 'bg-granate text-papel'
      : tono === 'morado'
        ? 'bg-morado-junta text-papel'
        : tono === 'verde'
          ? 'bg-verde-portal text-papel'
          : 'bg-mostaza text-tinta';

  return (
    <div className={`anim-aparecer-escala border-y-4 border-tinta ${fondo} ${className}`}>
      <div className="px-4 py-3 text-center">
        {kicker ? <p className="texto-sello opacity-80">{kicker}</p> : null}
        <p className="texto-cartel text-[clamp(1.4rem,7vw,2.6rem)] leading-none">{titulo}</p>
        {linea ? <p className="mt-1 text-sm opacity-90">{linea}</p> : null}
      </div>
    </div>
  );
}

// ── Marcador que cuenta ──────────────────────────────────────────────────────

export function ScoreTicker({
  valor,
  className = '',
  duracion = DUR.dramatica,
}: {
  valor: number;
  className?: string;
  duracion?: number;
}) {
  const reducido = useReducedMotion();
  const [mostrado, setMostrado] = useState(valor);
  const anterior = useRef(valor);

  useEffect(() => {
    if (reducido) {
      setMostrado(valor);
      anterior.current = valor;
      return;
    }
    const desde = anterior.current;
    const delta = valor - desde;
    if (delta === 0) return;

    const inicio = performance.now();
    let animacion = 0;

    const paso = (ahora: number) => {
      const avance = Math.min(1, (ahora - inicio) / duracion);
      // Salida suave: rápido al principio, frena al final.
      const suave = 1 - Math.pow(1 - avance, 3);
      setMostrado(Math.round(desde + delta * suave));
      if (avance < 1) animacion = requestAnimationFrame(paso);
      else anterior.current = valor;
    };

    animacion = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(animacion);
  }, [valor, duracion, reducido]);

  return (
    <span className={`marcador ${className}`} aria-live="polite">
      {mostrado.toLocaleString('es-ES')}
    </span>
  );
}

// ── Números flotantes (+1.300) ───────────────────────────────────────────────

export function FloatingPoints({ puntos, clave }: { puntos: number; clave: string | number }) {
  const reducido = useReducedMotion();
  if (puntos === 0) return null;

  return (
    <span
      key={clave}
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2"
      style={
        reducido
          ? undefined
          : { animation: 'subir-y-desvanecer 1200ms var(--ease-salida) both' }
      }
    >
      <span
        className={`marcador text-3xl ${puntos > 0 ? 'text-verde-portal' : 'text-rojo-buzon'}`}
        style={{ textShadow: '0 2px 0 rgba(255,255,255,0.6)' }}
      >
        {puntos > 0 ? '+' : ''}
        {puntos}
      </span>
    </span>
  );
}

// ── Chispas de reacción ──────────────────────────────────────────────────────

export function ReactionBurst({
  activo,
  intensidad = 1,
  tono = 'verde',
}: {
  activo: boolean;
  /** 1 = discreto · 4 = momento extraordinario. */
  intensidad?: number;
  tono?: 'verde' | 'mostaza' | 'rojo';
}) {
  const reducido = useReducedMotion();
  const particulas = useMemo(() => {
    const cantidad = Math.min(26, 6 + intensidad * 5);
    return Array.from({ length: cantidad }, (_, indice) => {
      const angulo = (indice / cantidad) * Math.PI * 2;
      const distancia = 40 + ((indice * 37) % 60);
      return {
        id: indice,
        dx: `${Math.round(Math.cos(angulo) * distancia)}px`,
        dy: `${Math.round(Math.sin(angulo) * distancia - 20)}px`,
        retardo: `${(indice % 5) * 40}ms`,
      };
    });
  }, [intensidad]);

  if (!activo || reducido) return null;

  const color =
    tono === 'mostaza'
      ? 'var(--color-mostaza)'
      : tono === 'rojo'
        ? 'var(--color-rojo-buzon)'
        : 'var(--color-verde-claro)';

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-visible">
      {particulas.map((particula) => (
        <span
          key={particula.id}
          className="absolute left-1/2 top-1/2 block h-1.5 w-1.5"
          style={{
            background: color,
            ['--dx' as string]: particula.dx,
            ['--dy' as string]: particula.dy,
            animation: `chispa 700ms var(--ease-salida) ${particula.retardo} both`,
          }}
        />
      ))}
    </span>
  );
}

// ── Overlay de evento ────────────────────────────────────────────────────────

export function EventOverlay({
  abierto,
  children,
  etiqueta,
}: {
  abierto: boolean;
  children: ReactNode;
  etiqueta: string;
}) {
  if (!abierto) return null;
  return (
    <div className="overlay-evento flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={etiqueta}>
      <div className="anim-aparecer-escala w-full max-w-lg">{children}</div>
    </div>
  );
}

// ── Ticker de Radio Patio ────────────────────────────────────────────────────

export function GossipTicker({ mensajes }: { mensajes: string[] }) {
  if (mensajes.length === 0) return null;
  const texto = mensajes.join('   ·   ');

  return (
    <div className="ticker py-1.5 text-[0.7rem]" role="marquee" aria-label="Radio Patio">
      <span className="ticker-pista">
        📡 Radio Patio: {texto}
        {'   ·   '}
      </span>
    </div>
  );
}

// ── Medidor de combo ─────────────────────────────────────────────────────────

export function ComboMeter({
  combo,
  titulo,
  className = '',
}: {
  combo: number;
  titulo?: string;
  className?: string;
}) {
  if (combo < 2) return null;
  const clase = combo >= 8 ? 'combo-8' : combo >= 5 ? 'combo-5' : combo >= 3 ? 'combo-3' : 'combo-2';

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className={`marcador text-lg ${clase}`}>×{combo}</span>
      {titulo ? <span className="texto-sello text-[0.6rem] text-tinta-suave">{titulo}</span> : null}
    </span>
  );
}

// ── Insignia de rareza ───────────────────────────────────────────────────────

export function RarityBadge({
  rareza,
  children,
  className = '',
}: {
  rareza: 'comun' | 'curioso' | 'raro' | 'legendario';
  children: ReactNode;
  className?: string;
}) {
  const etiqueta =
    rareza === 'legendario'
      ? 'Legendario'
      : rareza === 'raro'
        ? 'Raro'
        : rareza === 'curioso'
          ? 'Curioso'
          : 'Común';

  return (
    <span
      className={`chip rareza-${rareza} bg-papel ${className}`}
      title={`Rareza: ${etiqueta}`}
    >
      {children}
      <span className="sr-only"> (rareza: {etiqueta})</span>
    </span>
  );
}
