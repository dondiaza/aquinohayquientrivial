import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LinkButton } from '@/components/ui/Button';
import { Papel, Placa } from '@/components/ui/Surfaces';
import { RETRATOS_COMMONS } from '@/content/media/commons';
import { CONFIRMADOS, RECHAZADOS, estaConfirmado, estaRechazado } from '@/content/media/confirmados';
import { isAdmin } from '@/server/admin';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Revisar fotos' };

/**
 * REVISAR LAS CARAS, QUE ES ALGO QUE NO PUEDE HACER UNA MÁQUINA.
 *
 * El barrido de Commons comprueba la licencia impecablemente y no puede comprobar quién sale
 * en la foto. Se demostró publicando una lápida en el hueco de Eduardo García y un coche de
 * Fórmula en el de Santiago Ramos.
 *
 * Por eso todo entra como `pending` —que no se sirve— y solo se publica lo que figura en
 * `confirmados.ts`. Esta pantalla es donde se mira.
 *
 * ## Por qué no hay botones que escriban solos
 *
 * La tentación era una Server Action que reescribiera `confirmados.ts`. No se ha hecho, y es
 * deliberado: **la lista blanca es código, y el código se revisa en un diff**. Un panel que
 * modifica un fichero fuente desde el navegador convierte una decisión que queda registrada
 * en el historial en un cambio que aparece de la nada. Aquí se mira, se decide, y se copia la
 * línea que hay que pegar — que es un segundo de trabajo y deja rastro.
 */
export default async function RevisarMediosPage() {
  if (!(await isAdmin())) redirect('/admin/entrar');

  const porRevisar = RETRATOS_COMMONS.filter(
    (asset) => !estaConfirmado(asset.id) && !estaRechazado(asset.id),
  );
  const confirmados = RETRATOS_COMMONS.filter((asset) => estaConfirmado(asset.id));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Placa className="px-5 py-5 pt-7">
        <h1 className="text-3xl sm:text-4xl">Revisar fotos</h1>
      </Placa>
      <p className="mt-3 max-w-prose text-sm text-tinta-suave">
        La licencia ya está comprobada en todas. Lo que hay que mirar es si la persona de la
        foto es quien dice ser: eso ninguna máquina lo sabe, y ya nos costó publicar una lápida
        en el hueco de Eduardo García.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Papel className="p-4">
          <p className="texto-sello text-tinta-tenue">Por revisar</p>
          <p className="marcador text-3xl text-mostaza">{porRevisar.length}</p>
        </Papel>
        <Papel className="p-4">
          <p className="texto-sello text-tinta-tenue">Confirmadas</p>
          <p className="marcador text-3xl text-verde-portal">{confirmados.length}</p>
        </Papel>
        <Papel className="p-4">
          <p className="texto-sello text-tinta-tenue">Rechazadas</p>
          <p className="marcador text-3xl text-rojo-buzon">{RECHAZADOS.length}</p>
        </Papel>
      </div>

      {porRevisar.length === 0 ? (
        <div className="papel mt-6 p-6 text-center">
          <p className="texto-cartel text-xl">No hay nada esperando</p>
          <p className="mt-1 text-sm text-tinta-suave">
            Todo lo que ha bajado el barrido está decidido. Cuando vuelvas a pasarlo
            (<code>npm run medios:barrer</code>) los candidatos nuevos aparecerán aquí.
          </p>
        </div>
      ) : (
        <section className="mt-6">
          <h2 className="text-xl">Esperando decisión</h2>
          <p className="mt-1 max-w-prose text-sm text-tinta-suave">
            Mira la cara y compárala con el personaje. Si es correcta, copia su línea y pégala
            en <code>src/content/media/confirmados.ts</code>. Si no, a{' '}
            <code>RECHAZADOS</code> con el motivo — un rechazo sin registrar se vuelve a
            proponer en el siguiente barrido.
          </p>

          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {porRevisar.map((asset) => (
              <li key={asset.id} className="papel p-3">
                <div className="flex gap-3">
                  {asset.localPath ? (
                    <img
                      src={asset.localPath}
                      alt=""
                      width={140}
                      height={140}
                      className="h-[140px] w-[140px] shrink-0 border-2 border-tinta object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 text-sm">
                    <p className="texto-cartel leading-tight">
                      {asset.characters?.join(', ') ?? '—'}
                    </p>
                    <p className="texto-sello text-tinta-tenue">{asset.interprete}</p>
                    <p className="mt-1 text-xs text-tinta-suave">{asset.title}</p>
                    <p className="texto-sello mt-1 text-[0.6rem] text-tinta-tenue">
                      {asset.license}
                    </p>
                    {asset.sourcePage ? (
                      <a
                        href={asset.sourcePage}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="texto-sello text-[0.6rem] underline"
                      >
                        Ver en Commons
                      </a>
                    ) : null}
                  </div>
                </div>
                <pre className="mt-2 overflow-x-auto border border-linea bg-papel-alto p-2 text-[0.65rem]">
                  <code>{`  '${asset.id}',`}</code>
                </pre>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-xl">Ya decididas</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="texto-sello text-tinta-tenue">Confirmadas · {CONFIRMADOS.length}</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {confirmados.map((asset) => (
                <li key={asset.id} title={`${asset.interprete} · ${asset.license}`}>
                  {asset.miniPath ? (
                    <img
                      src={asset.miniPath}
                      alt={asset.interprete ?? ''}
                      width={44}
                      height={44}
                      className="h-11 w-11 border border-verde-portal object-cover"
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="texto-sello text-tinta-tenue">Rechazadas · {RECHAZADOS.length}</p>
            <ul className="mt-1.5 space-y-0.5">
              {RECHAZADOS.map((entrada) => (
                <li key={entrada.id} className="text-[0.7rem] leading-snug text-tinta-tenue">
                  <code className="text-[0.65rem]">{entrada.id.replace('commons:', '')}</code> —{' '}
                  {entrada.motivo}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <p className="mt-8 flex flex-wrap gap-2">
        <LinkButton href="/admin/medios" tone="papel" size="sm">
          Inventario de medios
        </LinkButton>
        <LinkButton href="/admin" tone="fantasma" size="sm">
          ← Portería
        </LinkButton>
      </p>
    </div>
  );
}
