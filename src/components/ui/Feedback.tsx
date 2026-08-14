/** Estados vacíos, de error y de carga. Con lenguaje de portal, no de dashboard. */

import type { ReactNode } from 'react';

import { LinkButton } from './Button';
import { Nota, Papel } from './Surfaces';

export function EmptyState({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion: string;
  accion?: { href: string; label: string };
}) {
  return (
    <Papel className="p-6 text-center">
      <p className="texto-cartel text-lg">{titulo}</p>
      <p className="mx-auto mt-2 max-w-prose text-sm text-tinta-suave">{descripcion}</p>
      {accion ? (
        <div className="mt-4">
          <LinkButton href={accion.href} tone="papel" size="sm">
            {accion.label}
          </LinkButton>
        </div>
      ) : null}
    </Papel>
  );
}

export function ErrorNote({
  titulo = 'Se ha atascado algo',
  children,
}: {
  titulo?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="border-2 border-rojo-buzon bg-papel p-4 shadow-[2px_3px_0_rgba(35,32,27,0.18)]"
    >
      <p className="texto-cartel text-rojo-buzon">⚠ {titulo}</p>
      <div className="mt-1 text-sm text-tinta-suave">{children}</div>
    </div>
  );
}

/** Aviso amable, tipo circular en el tablón. */
export function Aviso({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <Nota tone="azul" className={`p-3 text-sm ${className}`}>
      {children}
    </Nota>
  );
}

export function Cargando({ texto = 'Un poquito de por favor…' }: { texto?: string }) {
  return (
    <div className="flex items-center gap-3 p-6 text-tinta-suave" aria-live="polite">
      <span
        aria-hidden
        className="inline-block h-4 w-4 animate-spin border-2 border-tinta border-t-transparent"
      />
      <span className="texto-sello">{texto}</span>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gotele-oscuro ${className}`} aria-hidden />;
}
