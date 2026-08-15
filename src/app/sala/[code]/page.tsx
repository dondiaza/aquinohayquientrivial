import type { Metadata } from 'next';

import { Mando } from '@/components/sala/Mando';
import { esCodigoValido, normalizarCodigo } from '@/domain/party/codigo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Tu mando' };

/**
 * EL MANDO. Deliberadamente ligero en el servidor: la identidad vive en el navegador
 * (`localStorage`), así que recargar aquí no pierde la sesión ni crea un jugador duplicado.
 */
export default async function SalaPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: bruto } = await params;
  const code = normalizarCodigo(bruto);

  if (!esCodigoValido(code)) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="texto-cartel text-2xl">Esa comunidad no existe</p>
        <a className="btn btn-rojo mt-4" href="/unirse">
          Revisar el código
        </a>
      </div>
    );
  }

  return <Mando code={code} />;
}
