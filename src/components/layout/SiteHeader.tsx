import Link from 'next/link';

import { BRAND } from '@/domain/copy/ui';

const LINKS = [
  { href: '/jugar', label: 'Jugar' },
  { href: '/como-jugar', label: 'Cómo jugar' },
  { href: '/admin/preguntas', label: 'Preguntas' },
];

/** Cabecera: la fachada del portal, con su placa y su telefonillo. */
export function SiteHeader() {
  return (
    <header className="azulejo">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-10 w-10 items-center justify-center border-2 border-verde-portal bg-papel text-lg shadow-[2px_2px_0_rgba(35,32,27,0.35)]"
          >
            13
          </span>
          <span className="leading-tight">
            <span className="texto-cartel block text-lg text-verde-portal sm:text-xl">
              {BRAND.short}
            </span>
            <span className="texto-sello block text-[0.62rem] text-verde-portal/80">
              Travesía del Portalón, 13
            </span>
          </span>
        </Link>

        <nav aria-label="Navegación principal">
          <ul className="flex items-center gap-1 sm:gap-2">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="texto-sello inline-block border-2 border-transparent px-2 py-1.5 text-verde-portal hover:border-verde-portal hover:bg-papel"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
