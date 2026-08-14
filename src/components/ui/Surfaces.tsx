/**
 * Superficies del portal: notas pegadas, papel, placas de puerta, tablón y sellos.
 * Son los "materiales" con los que se construye toda la interfaz.
 */

import type { ReactNode } from 'react';

type Tilt = 'none' | 'izq' | 'der';

const TILT_CLASS: Record<Tilt, string> = {
  none: '',
  izq: 'girada-izq',
  der: 'girada-der',
};

export type NotaTone = 'mostaza' | 'papel' | 'azul' | 'verde';

const NOTA_TONE_CLASS: Record<NotaTone, string> = {
  mostaza: '',
  papel: 'nota-papel',
  azul: 'nota-azul',
  verde: 'nota-verde',
};

export function Nota({
  children,
  tone = 'mostaza',
  tilt = 'none',
  pin,
  className = '',
}: {
  children: ReactNode;
  tone?: NotaTone;
  tilt?: Tilt;
  /** Adorno superior: cinta adhesiva o chincheta. */
  pin?: 'cinta' | 'chincheta';
  className?: string;
}) {
  const pinClass = pin === 'cinta' ? 'con-cinta' : pin === 'chincheta' ? 'con-chincheta' : '';
  return (
    <div className={`nota ${NOTA_TONE_CLASS[tone]} ${TILT_CLASS[tilt]} ${pinClass} ${className}`}>
      {children}
    </div>
  );
}

export function Papel({
  children,
  className = '',
  tilt = 'none',
}: {
  children: ReactNode;
  className?: string;
  tilt?: Tilt;
}) {
  return <div className={`papel ${TILT_CLASS[tilt]} ${className}`}>{children}</div>;
}

export type PlacaTone = 'verde' | 'azul' | 'roja';

const PLACA_TONE_CLASS: Record<PlacaTone, string> = {
  verde: '',
  azul: 'placa-azul',
  roja: 'placa-roja',
};

/** Placa de puerta atornillada: la usamos para títulos de sección. */
export function Placa({
  children,
  tone = 'verde',
  className = '',
}: {
  children: ReactNode;
  tone?: PlacaTone;
  className?: string;
}) {
  return <div className={`placa ${PLACA_TONE_CLASS[tone]} ${className}`}>{children}</div>;
}

export function Tablon({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`tablon ${className}`}>{children}</div>;
}

export function Sello({
  children,
  tone = 'demo',
  className = '',
}: {
  children: ReactNode;
  tone?: 'demo' | 'ok';
  className?: string;
}) {
  return (
    <span className={`sello ${tone === 'demo' ? 'sello-demo' : 'sello-ok'} ${className}`}>
      {children}
    </span>
  );
}

export function Chip({
  children,
  title,
  className = '',
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span className={`chip ${className}`} title={title}>
      {children}
    </span>
  );
}

/** Cabecera de sección con placa + subtítulo opcional. */
export function SeccionTitulo({
  titulo,
  subtitulo,
  tone = 'verde',
  className = '',
}: {
  titulo: string;
  subtitulo?: string;
  tone?: PlacaTone;
  className?: string;
}) {
  return (
    <div className={className}>
      <Placa tone={tone} className="px-6 py-3 pt-5">
        <h2 className="text-xl sm:text-2xl">{titulo}</h2>
      </Placa>
      {subtitulo ? <p className="mt-2 text-sm text-tinta-suave">{subtitulo}</p> : null}
    </div>
  );
}
