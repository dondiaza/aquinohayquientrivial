import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { PantallaHost } from '@/components/sala/PantallaHost';
import { esCodigoValido, normalizarCodigo } from '@/domain/party/codigo';
import { cargarSala } from '@/server/party/service';
import { baseDeSitio, qrSvg, urlDeUnion } from '@/server/party/qr';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Pantalla del portal' };

/**
 * LA PANTALLA GRANDE.
 *
 * El QR se genera aquí, en el servidor, y viaja ya dibujado: en una tele tiene que estar
 * nítido y estar al instante. La base de la URL sale de la cabecera `host`, así que en el
 * salón de casa funciona sin configurar nada (los móviles del wifi entran por la IP local).
 */
export default async function PantallaPortalPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: bruto } = await params;
  const code = normalizarCodigo(bruto);
  if (!esCodigoValido(code)) notFound();

  const sala = await cargarSala(code);
  if (!sala) notFound();

  const cabeceras = await headers();
  const base = baseDeSitio({ headers: cabeceras });
  const url = urlDeUnion(base, code);
  const qr = await qrSvg(url);

  return <PantallaHost code={code} qr={qr} urlUnion={url} />;
}
