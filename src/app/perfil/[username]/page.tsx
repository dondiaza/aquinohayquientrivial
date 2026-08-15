import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ApartmentPlaque, PaperNotice } from '@/components/portal/Estructuras';
import { NeighbourAvatar } from '@/components/portal/Avatar';
import { LinkButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Surfaces';
import { comoArquetipo, comoColor } from '@/components/sala/avatar';
import { puedeVer } from '@/domain/cuentas/identidad';
import { rangoPorId } from '@/domain/progression/progression';
import { cuentaPorUsername, relacionEntre, visibilidad } from '@/server/cuentas/service';
import { usuarioActual } from '@/server/cuentas/sesion';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `${username} · Ficha de vecino` };
}

/**
 * PERFIL PÚBLICO.
 *
 * Lo que se ve depende de la privacidad de quien lo tiene, y eso se decide AQUÍ, en el
 * servidor: si alguien ha puesto sus estadísticas en «solo amigos», no se mandan al
 * navegador y no hay forma de sacarlas desde las herramientas de desarrollo.
 */
export default async function PerfilPublicoPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const cuenta = await cuentaPorUsername(username);
  if (!cuenta) notFound();

  const sesion = await usuarioActual();
  const relacion = await relacionEntre(sesion?.userId ?? null, cuenta.id);

  // Un bloqueo hace que el perfil sencillamente no exista para quien mira.
  if (relacion.estaBloqueado) notFound();

  const vePerfil = puedeVer(visibilidad(cuenta.settings?.perfilVisible), relacion);
  if (!vePerfil) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ApartmentPlaque vivienda="Ficha" titulo="Esta ficha es privada" />
        <p className="mt-4 text-tinta-suave">
          Este vecino ha preferido no enseñarla. Nada personal.
        </p>
      </div>
    );
  }

  const veEstadisticas = puedeVer(visibilidad(cuenta.settings?.estadisticasVisibles), relacion);
  const perfil = cuenta.profile;
  const rango = rangoPorId(perfil?.rango ?? 'visitante');
  const precision =
    perfil && perfil.respuestas > 0 ? Math.round((perfil.aciertos / perfil.respuestas) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="papel flex flex-wrap items-center gap-4 p-5">
        <NeighbourAvatar
          arquetipo={comoArquetipo(perfil?.arquetipo ?? 'presidente')}
          color={comoColor(perfil?.colorAvatar ?? 'verde')}
          marco="ninguno"
          tamano={88}
        />
        <div className="min-w-0 flex-1">
          <h1 className="texto-cartel text-2xl">{cuenta.username}</h1>
          <p className="texto-sello text-tinta-tenue">
            Nivel {perfil?.nivel ?? 1} · {rango.icon} {rango.label}
          </p>
          {perfil?.titulo ? <p className="mt-1 text-sm text-tinta-suave">{perfil.titulo}</p> : null}
          <p className="mt-2 flex flex-wrap gap-1">
            {cuenta.streak && cuenta.streak.actual > 0 ? (
              <Chip>🔥 {cuenta.streak.actual} días</Chip>
            ) : null}
            {relacion.esAmigo ? <Chip>Vecino tuyo</Chip> : null}
          </p>
        </div>
      </div>

      {veEstadisticas && perfil ? (
        <section className="mt-6">
          <h2 className="text-lg">Sus números</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Experiencia', perfil.xp],
              ['Partidas', perfil.partidas],
              ['Precisión', `${precision} %`],
              ['Mejor racha', perfil.mejorRacha],
            ].map(([etiqueta, valor]) => (
              <div key={String(etiqueta)} className="papel p-3 text-center">
                <dt className="texto-sello text-tinta-tenue">{etiqueta}</dt>
                <dd className="marcador text-2xl text-verde-portal">{valor}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : (
        <PaperNotice tono="papel" className="mt-6 p-4">
          <p className="text-sm text-tinta-suave">
            Este vecino guarda sus estadísticas para sí mismo y para sus amigos.
          </p>
        </PaperNotice>
      )}

      <p className="mt-8 flex flex-wrap gap-2">
        {sesion ? (
          <LinkButton href="/amigos" tone="papel" size="sm">
            Tus vecinos
          </LinkButton>
        ) : null}
        <LinkButton href="/" tone="fantasma" size="sm">
          ← Volver al portal
        </LinkButton>
      </p>
    </div>
  );
}
