import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LinkButton } from '@/components/ui/Button';
import { Papel, Placa } from '@/components/ui/Surfaces';
import { FAMILIAS, type FamiliaHueco } from '@/content/media/huecos';
import { LISTA_DE_DESEOS } from '@/content/media/wishlist';
import { isAdmin } from '@/server/admin';
import { inventario, type EstadoHueco } from '@/server/media/inventario';
import { inventarioDeMedios } from '@/server/media/service';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Medios' };

const ETIQUETA_ESTADO: Record<EstadoHueco, { texto: string; clase: string }> = {
  aportado: { texto: 'Aportado', clase: 'bg-verde-portal text-papel' },
  licencia: { texto: 'Con licencia', clase: 'bg-azul-rellano text-papel' },
  original: { texto: 'Arte propio', clase: 'bg-mostaza text-tinta' },
  esperando: { texto: 'Esperando', clase: 'border-2 border-rojo-buzon text-rojo-buzon' },
};

export default async function AdminMediosPage({
  searchParams,
}: {
  searchParams: Promise<{ familia?: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin/entrar');

  const filtros = await searchParams;
  const familia = FAMILIAS.some((entrada) => entrada.id === filtros.familia)
    ? (filtros.familia as FamiliaHueco)
    : null;

  const { filas, porFamilia, resumen } = inventario();
  const manifiesto = inventarioDeMedios();
  const visibles = familia ? filas.filter((fila) => fila.hueco.familia === familia) : filas;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Placa className="px-5 py-5 pt-7">
        <h1 className="text-3xl sm:text-4xl">Medios</h1>
      </Placa>
      <p className="mt-3 max-w-prose text-sm text-tinta-suave">
        Cada sitio de la aplicación que pide una imagen está declarado aquí con su nombre
        exacto. Lo que aparece como <strong>Esperando</strong> no es un fallo: es material con
        dueño que todavía no tenemos permiso para publicar, con su hueco preparado y su arte
        propio detrás mientras tanto.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Papel className="p-4">
          <p className="texto-sello text-tinta-tenue">Huecos</p>
          <p className="marcador text-3xl">{resumen.total}</p>
        </Papel>
        <Papel className="p-4">
          <p className="texto-sello text-tinta-tenue">Aportados</p>
          <p className="marcador text-3xl text-verde-portal">{resumen.aportados}</p>
        </Papel>
        <Papel className="p-4">
          <p className="texto-sello text-tinta-tenue">Con licencia</p>
          <p className="marcador text-3xl">{resumen.conLicencia}</p>
        </Papel>
        <Papel className="p-4">
          <p className="texto-sello text-tinta-tenue">Arte propio</p>
          <p className="marcador text-3xl">{resumen.originales}</p>
        </Papel>
        <Papel className="p-4">
          <p className="texto-sello text-tinta-tenue">Esperando</p>
          <p className="marcador text-3xl text-rojo-buzon">{resumen.esperando}</p>
        </Papel>
      </div>

      {/* Si algo con licencia se ha quedado sin crédito, eso SÍ es un fallo y se canta. */}
      {manifiesto.sinCredito.length > 0 ? (
        <p
          role="alert"
          className="mt-4 rounded-md border-2 border-rojo-buzon bg-papel p-3 text-sm"
        >
          <strong>Falta atribución</strong> en material con licencia que la exige:{' '}
          {manifiesto.sinCredito.join(', ')}. Hasta arreglarlo, no debería publicarse.
        </p>
      ) : null}

      <nav className="mt-6 flex flex-wrap gap-1" aria-label="Familias de huecos">
        <a href="/admin/medios" className={familia ? 'chip' : 'chip chip-activo'}>
          Todo · {resumen.total}
        </a>
        {porFamilia.map((entrada) => (
          <a
            key={entrada.familia}
            href={`/admin/medios?familia=${entrada.familia}`}
            className={familia === entrada.familia ? 'chip chip-activo' : 'chip'}
          >
            {entrada.label} · {entrada.resueltos}/{entrada.total}
          </a>
        ))}
      </nav>

      <section className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <thead>
            <tr className="texto-sello text-left text-tinta-tenue">
              <th scope="col" className="p-2">Hueco</th>
              <th scope="col" className="p-2">Qué debería verse</th>
              <th scope="col" className="p-2">Dónde se pinta</th>
              <th scope="col" className="p-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((fila) => {
              const etiqueta = ETIQUETA_ESTADO[fila.estado];
              return (
                <tr key={fila.hueco.id} className="border-t border-linea align-top">
                  <td className="p-2">
                    <span className="texto-cartel block">{fila.hueco.titulo}</span>
                    <code className="text-[0.7rem] text-tinta-tenue">{fila.hueco.id}</code>
                    {fila.ruta ? (
                      <img
                        src={fila.ruta}
                        alt=""
                        width={56}
                        height={56}
                        className="mt-1 h-14 w-14 rounded border border-linea object-cover"
                      />
                    ) : null}
                  </td>
                  <td className="max-w-[18rem] p-2 text-tinta-suave">
                    {fila.hueco.describe}
                    {fila.asset?.attribution ? (
                      <span className="texto-sello mt-1 block text-tinta-tenue">
                        {fila.asset.attribution}
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-[14rem] p-2 text-tinta-tenue">{fila.hueco.donde}</td>
                  <td className="p-2">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs ${etiqueta.clase}`}>
                      {etiqueta.texto}
                    </span>
                    {fila.queFalta ? (
                      <span className="mt-1 block text-[0.7rem] text-tinta-tenue">
                        {fila.queFalta}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Lista de deseos</h2>
        <p className="mt-1 max-w-prose text-sm text-tinta-suave">
          Material concreto que se ha localizado y <strong>no</strong> se ha copiado, con su
          origen y qué haría falta para poder usarlo. Está aquí para que se pueda pedir
          permiso, no para bajarlo.
        </p>
        <ul className="mt-3 space-y-2">
          {LISTA_DE_DESEOS.map((deseo) => (
            <li key={deseo.id} className="papel p-3 text-sm">
              <p className="texto-cartel">{deseo.title}</p>
              <p className="text-tinta-suave">{deseo.describe}</p>
              <p className="mt-1 text-tinta-tenue">
                <strong>Hace falta:</strong> {deseo.queHaceFalta}
              </p>
              <a
                href={deseo.sourcePage}
                target="_blank"
                rel="noreferrer noopener"
                className="texto-sello underline"
              >
                Origen
              </a>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 flex flex-wrap gap-2">
        <LinkButton href="/admin/medios/revisar" tone="mostaza" size="sm">
          Revisar caras pendientes
        </LinkButton>
        <LinkButton href="/admin" tone="fantasma" size="sm">
          ← Portería
        </LinkButton>
      </p>
    </div>
  );
}
