import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * `/u/marta` -> `/perfil/marta`.
 *
 * El enunciado pide `/u/[username]` y la ficha ya vive en `/perfil/[username]`. En lugar de
 * duplicar la pantalla, se deja el alias corto: es el que se comparte y el que se teclea.
 */
export default async function PerfilCortoPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  redirect(`/perfil/${encodeURIComponent(username)}`);
}
