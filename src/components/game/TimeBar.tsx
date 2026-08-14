'use client';

/**
 * BARRA DE TIEMPO con tensión en tres niveles (§19):
 *   · > 50 % → normal, verde;
 *   · 25-50 % → aviso, mostaza y latido lento;
 *   · < 25 % → urgente, rojo y latido rápido.
 *
 * Nada de parpadeos agresivos. Y el estado nunca depende solo del color: cambia el
 * ancho, cambia el número de segundos y se anuncia por `aria-live` al final.
 */
export function TimeBar({
  remainingMs,
  totalMs,
  paused = false,
  etiquetaPausa,
}: {
  remainingMs: number;
  totalMs: number;
  paused?: boolean;
  /** Texto que sustituye a los segundos cuando está en pausa (p. ej. «memoriza»). */
  etiquetaPausa?: string;
}) {
  const ratio = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const seconds = Math.ceil(remainingMs / 1000);
  const urgent = !paused && ratio <= 0.25;
  const warning = !paused && ratio <= 0.5 && !urgent;

  const color = urgent
    ? 'var(--color-rojo-buzon)'
    : warning
      ? 'var(--color-mostaza)'
      : 'var(--color-verde-claro)';

  const clase = urgent ? 'tiempo-urgente' : warning ? 'tiempo-aviso' : '';

  return (
    <div className={`flex items-center gap-2 ${clase}`}>
      <div className="barra-tiempo flex-1" role="presentation">
        <span style={{ width: `${ratio * 100}%`, background: color }} />
      </div>
      <span
        className={`marcador w-20 text-right text-lg ${urgent ? 'text-rojo-buzon' : ''}`}
        aria-hidden
      >
        {paused ? (etiquetaPausa ?? '—') : `${seconds}s`}
      </span>
      <span aria-live="polite" className="sr-only">
        {!paused && seconds <= 5 && seconds > 0 ? `Quedan ${seconds} segundos` : ''}
      </span>
    </div>
  );
}
