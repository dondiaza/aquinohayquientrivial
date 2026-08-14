import type { MetadataRoute } from 'next';

import { BRAND } from '@/domain/copy/ui';

/**
 * PWA — instalable, con iconos ORIGINALES (SVG propio) y color de tema del portal.
 *
 * A propósito NO hay service worker: una caché agresiva podría servir preguntas o
 * partidas obsoletas, que es justo lo que no queremos en un juego con estado. La app
 * se instala y arranca rápido, pero siempre habla con el servidor.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.short,
    description: BRAND.tagline,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#e7e0d2',
    theme_color: '#1e4b3e',
    lang: 'es',
    categories: ['games', 'trivia'],
    icons: [
      {
        src: '/icon.svg',
        type: 'image/svg+xml',
        sizes: 'any',
        purpose: 'any',
      },
      {
        src: '/icon-maskable.svg',
        type: 'image/svg+xml',
        sizes: 'any',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Jugar ahora', url: '/jugar/solo' },
      { name: 'Reto del día', url: '/reto' },
      { name: 'El portal', url: '/portal' },
      { name: 'Tu ficha', url: '/perfil' },
    ],
  };
}
