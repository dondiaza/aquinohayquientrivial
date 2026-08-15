import type { Metadata } from 'next';

import { ApartmentPlaque, PaperNotice } from '@/components/portal/Estructuras';
import { Entrar } from '@/components/sala/Entrar';
import { normalizarCodigo } from '@/domain/party/codigo';
import { cargarSala } from '@/server/party/service';

export const dynamic = 'force-dynamic';

/**
 * Metadatos Open Graph DINÁMICOS.
 *
 * Es lo que decide si el enlace que llega por WhatsApp parece una invitación o parece un
 * enlace cualquiera. Se cuenta cuánta gente hay y qué modo es, y nada más: el código ya está
 * en la URL, pero los nombres de quienes juegan NO se publican en una tarjeta que puede
 * acabar en un grupo de doscientas personas.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code: bruto } = await params;
  const code = normalizarCodigo(bruto);
  const sala = await cargarSala(code);

  if (!sala) {
    return {
      title: 'Esa junta no existe',
      description: 'Revisa el código: son cuatro caracteres.',
    };
  }

  const jugables = sala.players.filter(
    (fila) => fila.role === 'PLAYER' && fila.status !== 'KICKED' && fila.status !== 'LEFT',
  ).length;

  const empezada = sala.room.phase !== 'LOBBY';
  const titulo = empezada ? 'Junta en marcha' : 'Se convoca junta';
  const descripcion = empezada
    ? `La partida ya ha empezado, pero todavía puedes entrar. Código ${code}.`
    : jugables > 0
      ? `Junta de ${jugables} ${jugables === 1 ? 'vecino' : 'vecinos'}. Únete con el código ${code}.`
      : `Únete a la partida con el código ${code}.`;

  return {
    title: titulo,
    description: descripcion,
    openGraph: {
      title: `🏢 ${titulo}`,
      description: descripcion,
      type: 'website',
      locale: 'es_ES',
      siteName: 'El Trivial de Desengaño 21',
    },
    twitter: { card: 'summary', title: `🏢 ${titulo}`, description: descripcion },
    // Una invitación a una sala efímera no debe quedarse indexada.
    robots: { index: false, follow: false },
  };
}

/**
 * Destino del QR. El código ya viene puesto, así que solo queda el nombre: es el paso que
 * hace que desde escanear hasta estar dentro pasen unos diez segundos.
 *
 * Si la sala no existe o ya se cerró se dice con palabras, no con un 404 pelado.
 */
export default async function UnirseConCodigoPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: bruto } = await params;
  const code = normalizarCodigo(bruto);
  const sala = await cargarSala(code);

  if (!sala) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <ApartmentPlaque vivienda="Telefonillo" titulo="Esa comunidad no existe" />
        <p className="mt-4 text-tinta-suave">
          Revisa el código: son cuatro caracteres y salen en la pantalla grande.
        </p>
        <a className="btn btn-rojo mt-6" href="/unirse">
          Probar otro código
        </a>
      </div>
    );
  }

  const empezada = sala.room.phase !== 'LOBBY';

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <ApartmentPlaque
        vivienda={`Sala ${code}`}
        titulo="Ya casi estás"
        subtitulo="Pon un nombre y entra."
      />

      {empezada ? (
        <PaperNotice tono="mostaza" className="mt-4 p-3">
          <p className="texto-sello">La junta ya ha empezado</p>
          <p className="mt-1 text-sm text-tinta-suave">
            Puedes entrar igual: te colocamos con una puntuación intermedia para que no
            empieces en desventaja, o como público si ya va muy avanzada.
          </p>
        </PaperNotice>
      ) : null}

      <div className="mt-6">
        <Entrar codeInicial={code} />
      </div>
    </div>
  );
}
