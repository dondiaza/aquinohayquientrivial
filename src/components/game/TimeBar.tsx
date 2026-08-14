'use client';

/**
 * Barra de tiempo. Además del color, cambia el ancho y el texto de segundos, y avisa
 * por `aria-live` en los últimos cinco segundos: el estado no depende del color.
 */
export function TimeBar({
  remainingMs,
  totalMs,
  paused = false,
}: {
  remainingMs: number;
  totalMs: number;
  paused?: boolean;
}) {
  const ratio = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const seconds = Math.ceil(remainingMs / 1000);
  const urgent = ratio <= 0.25;
  const warning = ratio <= 0.5 && !urgent;

  const color = urgent
    ? 'var(--color-rojo-buzon)'
    : warning
      ? 'var(--color-mostaza)'
      : 'var(--color-verde-claro)';

  return (
    <div className="flex items-center gap-2">
      <div className="barra-tiempo flex-1" role="presentation">
        <span style={{ width: `${ratio * 100}%`, background: color }} />
      </div>
      <span
        className={`marcador w-12 text-right text-lg ${urgent ? 'text-rojo-buzon' : ''}`}
        aria-hidden
      >
        {paused ? '—' : `${seconds}s`}
      </span>
      <span aria-live="polite" className="sr-only">
        {!paused && seconds <= 5 ? `Quedan ${seconds} segundos` : ''}
      </span>
    </div>
  );
}
