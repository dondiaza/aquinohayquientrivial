import Link from 'next/link';

import { AudioControls } from '@/components/ui/AudioControls';
import { BuildingHeader } from '@/components/portal/Estructuras';
import { Porteria } from '@/components/cuenta/Porteria';
import { BRAND } from '@/domain/copy/ui';
import { SERIE } from '@/content/serie';
import { usuarioActual } from '@/server/cuentas/sesion';
import { currentGuestPlayerId } from '@/server/guest';
import { obtenerPerfil } from '@/server/players/service';

/**
 * «Ficha» sale de la lista: ahora se llega al perfil por la portería, que además dice si
 * estás identificado. Tener dos entradas al mismo sitio diciendo cosas distintas —una
 * neutra y otra que avisa de que puedes perder el progreso— confundía más que ayudaba.
 */
const LINKS = [
  { href: '/jugar', label: 'Jugar' },
  { href: '/reto', label: 'Reto' },
  { href: '/ranking', label: 'Ranking' },
  { href: '/portal', label: 'Portal' },
  { href: '/como-jugar', label: 'Cómo jugar' },
];

/** Cabecera: la fachada del portal, con su placa, su navegación y la portería. */
export async function SiteHeader() {
  const [sesion, guestId] = await Promise.all([usuarioActual(), currentGuestPlayerId()]);

  // Cuánto hay en juego, para que el aviso diga «tienes 12 partidas sin guardar» en vez de
  // una frase genérica sobre cuentas. Solo se consulta si NO hay sesión.
  const perfil = !sesion && guestId ? await obtenerPerfil(guestId) : null;
  return (
    <BuildingHeader
      numero="21"
      nombre={BRAND.short}
      direccion={SERIE.direccionFicticia}
      // En móvil la fila no cabe: la navegación scrollea dentro de su propia caja y la
      // portería se queda fija a la derecha. Sin esto la cabecera desbordaba la página entera
      // a lo ancho, y lo cazó el E2E, no el ojo.
      acciones={
        <div className="flex min-w-0 max-w-full items-center gap-1 sm:gap-2">
          <nav aria-label="Navegación principal" className="min-w-0 flex-1 overflow-x-auto">
            <ul className="flex flex-nowrap items-center gap-0.5 sm:gap-1.5">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="texto-sello inline-block whitespace-nowrap border-2 border-transparent px-2 py-1.5 text-verde-portal hover:border-verde-portal hover:bg-papel"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <span className="shrink-0">
            <AudioControls />
          </span>
          <Porteria
            username={sesion?.cuenta.username ?? null}
            porGuardar={
              perfil ? { partidas: perfil.gamesFinished, xp: perfil.xp } : null
            }
          />
        </div>
      }
    />
  );
}
