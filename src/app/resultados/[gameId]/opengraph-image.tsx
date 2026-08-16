import { ImageResponse } from 'next/og';

import { rankById } from '@/domain/ranks/ranks';
import { prisma } from '@/server/db';

/**
 * LA TARJETA DEL RESULTADO — una imagen, no un enlace.
 *
 * Compartir una partida mandaba una URL. Una URL en un grupo de WhatsApp es una línea azul que
 * nadie abre; una tarjeta con la puntuación y el rango es un resultado que se mira y que pica.
 * Es lo único de la lista de mejoras que puede traer gente nueva, y por eso va antes que
 * cualquier otra funcionalidad pendiente.
 *
 * ## Por qué `opengraph-image` y no un endpoint propio
 *
 * Next resuelve él solo la convención: coloca la etiqueta `og:image` en la página de
 * resultados, con su tamaño y su tipo, sin que haya que escribir metadatos a mano ni acordarse
 * de actualizarlos. Menos sitios donde equivocarse.
 *
 * ## Por qué no sale aquí el vecino dibujado
 *
 * El motor que genera la imagen entiende un subconjunto de CSS y no monta SVG arbitrario, y el
 * avatar son treinta capas de rutas. En lugar de pelearme con eso, la tarjeta se apoya en lo
 * que sí se lee de lejos: el número, el rango y el sello de la comunidad. Una tarjeta que se
 * entiende en la miniatura de un chat vale más que una con el retrato en pequeño.
 */

export const alt = 'Resultado de la partida';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const PAPEL = '#f7f2e6';
const TINTA = '#23201b';
const VERDE = '#1e4b3e';
const MOSTAZA = '#e0a32b';
const ROJO = '#a6301e';

export default async function TarjetaResultado({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  const partida = await prisma.game
    .findUnique({
      where: { id: gameId },
      select: { totalScore: true, summary: true, status: true },
    })
    .catch(() => null);

  const resumen = partida?.summary as {
    rankId?: string;
    accuracyPercent?: number;
    correctAnswers?: number;
    totalQuestions?: number;
  } | null;

  const rango = resumen?.rankId ? rankById(resumen.rankId) : null;
  const puntos = partida?.totalScore ?? 0;
  const precision = resumen?.accuracyPercent ?? 0;
  const aciertos = resumen?.correctAnswers ?? 0;
  const total = resumen?.totalQuestions ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: PAPEL,
          color: TINTA,
          padding: 56,
          border: `16px solid ${VERDE}`,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              width: 64,
              height: 64,
              alignItems: 'center',
              justifyContent: 'center',
              background: VERDE,
              color: PAPEL,
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            21
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>
              EL TRIVIAL DE LA COMUNIDAD
            </span>
            <span style={{ fontSize: 20, color: '#7d7466' }}>Desengaño 21</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 30, color: '#4f4940' }}>
            {rango ? 'Junta celebrada. Resultado:' : 'Partida en curso'}
          </span>
          <span
            style={{
              fontSize: 150,
              fontWeight: 800,
              lineHeight: 1,
              color: VERDE,
              marginTop: 8,
            }}
          >
            {puntos.toLocaleString('es-ES')}
          </span>
          {rango ? (
            <span style={{ fontSize: 44, fontWeight: 700, marginTop: 10, color: ROJO }}>
              {rango.icon} {rango.label}
            </span>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          <Dato etiqueta="Aciertos" valor={total > 0 ? `${aciertos} / ${total}` : '—'} />
          <Dato etiqueta="Precisión" valor={`${Math.round(precision)} %`} />
          <div
            style={{
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              justifyContent: 'flex-end',
              fontSize: 24,
              color: '#7d7466',
            }}
          >
            ¿Puedes con esto?
          </div>
        </div>
      </div>
    ),
    size,
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        border: `3px solid ${MOSTAZA}`,
        padding: '10px 20px',
      }}
    >
      <span style={{ fontSize: 18, color: '#7d7466', letterSpacing: 2 }}>
        {etiqueta.toUpperCase()}
      </span>
      <span style={{ fontSize: 40, fontWeight: 700 }}>{valor}</span>
    </div>
  );
}
