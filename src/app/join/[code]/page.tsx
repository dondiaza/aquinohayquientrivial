import { permanentRedirect } from 'next/navigation';

import { normalizarCodigo } from '@/domain/party/codigo';

export const dynamic = 'force-dynamic';

/**
 * `/join/4K7P` → `/unirse/4K7P`.
 *
 * Existe porque el enlace que se comparte se lee en voz alta, se teclea a mano y se pega en
 * un grupo: cuanto más corto y más reconocible, mejor. `join` lo entiende cualquiera aunque
 * el resto de la web esté en castellano.
 *
 * Redirección permanente: el enlace corto es un alias estable, no una página.
 */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  permanentRedirect(`/unirse/${normalizarCodigo(code)}`);
}
