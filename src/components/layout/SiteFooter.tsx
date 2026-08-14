import Link from 'next/link';

import { BRAND } from '@/domain/copy/ui';

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t-2 border-linea-fuerte bg-gotele-oscuro/60">
      <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-tinta-suave">
        <p className="texto-sello text-tinta">{BRAND.name}</p>
        <p className="mt-2 max-w-prose">{BRAND.legalNote}</p>
        <p className="mt-3 flex flex-wrap gap-3">
          <Link className="underline hover:text-tinta" href="/como-jugar">
            Cómo jugar
          </Link>
          <Link className="underline hover:text-tinta" href="/portal">
            El portal
          </Link>
          <Link className="underline hover:text-tinta" href="/pruebas">
            Pruebas y modos
          </Link>
          <Link className="underline hover:text-tinta" href="/tarjetas">
            Tarjetas
          </Link>
          <Link className="underline hover:text-tinta" href="/admin/preguntas">
            Banco de preguntas
          </Link>
          <Link className="underline hover:text-tinta" href="/unirse">
            Unirse a una sala (Fase 3)
          </Link>
        </p>
      </div>
    </footer>
  );
}
