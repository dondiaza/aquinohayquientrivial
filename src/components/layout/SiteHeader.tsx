import Link from 'next/link';

import { AudioControls } from '@/components/ui/AudioControls';
import { BuildingHeader } from '@/components/portal/Estructuras';
import { BRAND } from '@/domain/copy/ui';
import { SERIE } from '@/content/serie';

const LINKS = [
  { href: '/jugar', label: 'Jugar' },
  { href: '/reto', label: 'Reto' },
  { href: '/portal', label: 'Portal' },
  { href: '/perfil', label: 'Ficha' },
  { href: '/como-jugar', label: 'Cómo jugar' },
];

/** Cabecera: la fachada del portal, con su placa, su navegación y el control de sonido. */
export function SiteHeader() {
  return (
    <BuildingHeader
      numero="21"
      nombre={BRAND.short}
      direccion={SERIE.direccionFicticia}
      acciones={
        <div className="flex items-center gap-1 sm:gap-2">
          <nav aria-label="Navegación principal">
            <ul className="flex items-center gap-0.5 sm:gap-1.5">
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
          <AudioControls />
        </div>
      }
    />
  );
}
