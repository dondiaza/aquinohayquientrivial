import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ApartmentPlaque, PaperNotice } from '@/components/portal/Estructuras';
import { LinkButton } from '@/components/ui/Button';
import { PanelAjustes } from '@/components/cuenta/PanelAjustes';
import { CATEGORIAS, CATEGORIAS_OBLIGATORIAS } from '@/domain/notificaciones/catalogo';
import { prisma } from '@/server/db';
import { usuarioActual } from '@/server/cuentas/sesion';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Ajustes' };

export default async function AjustesPage() {
  const sesion = await usuarioActual();
  if (!sesion) redirect('/entrar');

  const ajustes = await prisma.userSettings.findUnique({
    where: { userId: sesion.userId },
    include: { preferencias: true },
  });

  const sesiones = await prisma.userSession.findMany({
    where: { userId: sesion.userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: 'desc' },
    select: { id: true, dispositivo: true, userAgent: true, lastSeenAt: true, ipPrefijo: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ApartmentPlaque
        vivienda="Administración"
        titulo="Ajustes"
        subtitulo="Tu cuenta, tu privacidad y qué avisos quieres."
      />

      <PanelAjustes
        username={sesion.cuenta.username}
        friendCode={sesion.cuenta.friendCode}
        email={sesion.cuenta.email}
        categorias={CATEGORIAS.map((categoria) => ({
          ...categoria,
          obligatoria: CATEGORIAS_OBLIGATORIAS.includes(categoria.id),
        }))}
        privacidadInicial={{
          perfilVisible: ajustes?.perfilVisible ?? 'TODOS',
          estadisticasVisibles: ajustes?.estadisticasVisibles ?? 'TODOS',
          presenciaVisible: ajustes?.presenciaVisible ?? 'AMIGOS',
          quienPuedeInvitar: ajustes?.quienPuedeInvitar ?? 'AMIGOS',
          quienPuedeRetar: ajustes?.quienPuedeRetar ?? 'AMIGOS',
          quienPuedeSolicitar: ajustes?.quienPuedeSolicitar ?? 'TODOS',
        }}
        silencioInicial={{
          activo: ajustes?.silencioActivo ?? true,
          desde: ajustes?.silencioDesde ?? 1380,
          hasta: ajustes?.silencioHasta ?? 540,
        }}
        preferenciasIniciales={(ajustes?.preferencias ?? []).map((preferencia) => ({
          categoria: preferencia.categoria,
          canal: preferencia.canal,
          activa: preferencia.activa,
        }))}
        sesiones={sesiones.map((entrada) => ({
          id: entrada.id,
          dispositivo: entrada.dispositivo ?? navegadorDe(entrada.userAgent),
          desde: entrada.ipPrefijo ?? 'desconocido',
          ultimaVez: entrada.lastSeenAt.toISOString(),
        }))}
      />

      <PaperNotice tono="papel" className="mt-8 p-4">
        <p className="texto-sello">Sobre los avisos</p>
        <p className="mt-1 text-sm text-tinta-suave">
          Apagues lo que apagues, todo lo importante te sigue esperando dentro de la aplicación.
          El push solo sirve para que no tengas que estar mirando.
        </p>
      </PaperNotice>

      <p className="mt-6">
        <LinkButton href="/perfil" tone="fantasma" size="sm">
          ← Tu ficha
        </LinkButton>
      </p>
    </div>
  );
}

/** Nombre legible del navegador a partir del user agent. Sin rastrear nada más. */
function navegadorDe(userAgent: string | null): string {
  if (!userAgent) return 'Dispositivo desconocido';
  if (/iPhone|iPad/i.test(userAgent)) return 'iPhone o iPad';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/Firefox/i.test(userAgent)) return 'Firefox';
  if (/Edg/i.test(userAgent)) return 'Edge';
  if (/Chrome/i.test(userAgent)) return 'Chrome';
  if (/Safari/i.test(userAgent)) return 'Safari';
  return 'Navegador';
}
