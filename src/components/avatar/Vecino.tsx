/**
 * EL VECINO — render del avatar.
 *
 * SVG puro, sin lienzo, sin imágenes y sin estado. La misma configuración da exactamente el
 * mismo dibujo siempre, así que se puede pintar en el servidor (bueno para el primer pintado
 * y para la tarjeta de resultados) y en el cliente (bueno para el creador, que actualiza a
 * cada toque sin pedir nada a la red).
 *
 * Todas las piezas son originales: siluetas de comunidad de vecinos, no retratos de nadie.
 *
 * El sistema de coordenadas es 100×100. La cabeza va centrada en (50, 38) y los hombros
 * arrancan en y=72, de modo que a tamaño 28 px —la lista de la clasificación— se sigue
 * distinguiendo quién es quién.
 */

import type { AvatarConfig } from '@/domain/avatar/config';
import { coloresDe } from '@/domain/avatar/config';

type Props = {
  config: AvatarConfig;
  tamano?: number;
  /** Sin fondo: para incrustarlo sobre otra cosa (una tarjeta, el podio). */
  sinFondo?: boolean;
  className?: string;
  titulo?: string;
};

// ── Piezas ──────────────────────────────────────────────────────────────────────

const CARA: Record<string, { rx: number; ry: number; cy: number }> = {
  ovalada: { rx: 20, ry: 24, cy: 38 },
  redonda: { rx: 22, ry: 22, cy: 38 },
  cuadrada: { rx: 21, ry: 22, cy: 39 },
  alargada: { rx: 18, ry: 26, cy: 37 },
};

const ANCHO_CUERPO: Record<string, number> = { estrecho: 26, medio: 32, ancho: 39 };
const DESPLAZAMIENTO_ALTURA: Record<string, number> = { baja: 4, media: 0, alta: -3 };

function Cejas({ tipo, color }: { tipo: string; color: string }) {
  const trazo = { stroke: color, strokeWidth: tipo === 'pobladas' ? 3.6 : tipo === 'finas' ? 1.4 : 2.4, strokeLinecap: 'round' as const, fill: 'none' };
  switch (tipo) {
    case 'arqueadas':
      return (
        <g {...trazo}>
          <path d="M38 30 q5 -4 10 0" />
          <path d="M62 30 q-5 -4 -10 0" />
        </g>
      );
    case 'enfadadas':
      return (
        <g {...trazo}>
          <path d="M38 28 L48 32" />
          <path d="M62 28 L52 32" />
        </g>
      );
    default:
      return (
        <g {...trazo}>
          <path d="M38 30 L47 30" />
          <path d="M62 30 L53 30" />
        </g>
      );
  }
}

function Ojos({ tipo }: { tipo: string }) {
  const blanco = '#fbf8f1';
  const iris = '#3a2f26';
  switch (tipo) {
    case 'grandes':
      return (
        <g>
          <ellipse cx={42} cy={38} rx={5} ry={5.5} fill={blanco} stroke="#3a2f26" strokeWidth={1} />
          <ellipse cx={58} cy={38} rx={5} ry={5.5} fill={blanco} stroke="#3a2f26" strokeWidth={1} />
          <circle cx={42} cy={38.5} r={2.4} fill={iris} />
          <circle cx={58} cy={38.5} r={2.4} fill={iris} />
        </g>
      );
    case 'entornados':
      return (
        <g stroke="#3a2f26" strokeWidth={2.2} strokeLinecap="round">
          <path d="M38 38 L46 38" />
          <path d="M54 38 L62 38" />
        </g>
      );
    case 'alegres':
      return (
        <g stroke="#3a2f26" strokeWidth={2.2} strokeLinecap="round" fill="none">
          <path d="M38 39 q4 -5 8 0" />
          <path d="M54 39 q4 -5 8 0" />
        </g>
      );
    case 'cansados':
      return (
        <g>
          <ellipse cx={42} cy={38} rx={4} ry={3.4} fill={blanco} stroke="#3a2f26" strokeWidth={1} />
          <ellipse cx={58} cy={38} rx={4} ry={3.4} fill={blanco} stroke="#3a2f26" strokeWidth={1} />
          <circle cx={42} cy={38} r={1.9} fill={iris} />
          <circle cx={58} cy={38} r={1.9} fill={iris} />
          <g stroke="#3a2f26" strokeWidth={0.9} opacity={0.5} strokeLinecap="round">
            <path d="M38.5 43 q3.5 2 7 0" />
            <path d="M54.5 43 q3.5 2 7 0" />
          </g>
        </g>
      );
    default:
      return (
        <g>
          <ellipse cx={42} cy={38} rx={4} ry={4.2} fill={blanco} stroke="#3a2f26" strokeWidth={1} />
          <ellipse cx={58} cy={38} rx={4} ry={4.2} fill={blanco} stroke="#3a2f26" strokeWidth={1} />
          <circle cx={42} cy={38.4} r={2} fill={iris} />
          <circle cx={58} cy={38.4} r={2} fill={iris} />
        </g>
      );
  }
}

function Nariz({ tipo, color }: { tipo: string; color: string }) {
  const trazo = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const };
  switch (tipo) {
    case 'chata':
      return <path d="M47 47 q3 2.5 6 0" {...trazo} />;
    case 'aguilena':
      return <path d="M49 40 L47 49 q3 1.5 5 -0.5" {...trazo} />;
    case 'redonda':
      return <circle cx={50} cy={46} r={3.4} fill={color} opacity={0.85} />;
    default:
      return <path d="M50 40 L50 47 q2 1 3.5 0" {...trazo} />;
  }
}

function Boca({ tipo }: { tipo: string }) {
  const trazo = { stroke: '#8c4a3f', strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' as const };
  switch (tipo) {
    case 'sonrisa':
      return (
        <g>
          <path d="M42 54 q8 8 16 0" fill="#8c4a3f" />
          <path d="M43 55 q7 3 14 0" stroke="#fbf8f1" strokeWidth={1.6} fill="none" />
        </g>
      );
    case 'media-sonrisa':
      return <path d="M43 55 q7 4 13 -1" {...trazo} />;
    case 'seria':
      return <path d="M43 56 L57 56" {...trazo} />;
    case 'protesta':
      return (
        <g>
          <ellipse cx={50} cy={56} rx={5} ry={4} fill="#8c4a3f" />
          <ellipse cx={50} cy={57.5} rx={2.6} ry={2} fill="#c07a6a" />
        </g>
      );
    default:
      return <path d="M43 55 q7 2.5 14 0" {...trazo} />;
  }
}

function Pelo({ tipo, color, cara }: { tipo: string; color: string; cara: string }) {
  const forma = CARA[cara] ?? CARA.ovalada!;
  const ancho = forma.rx + 2;
  switch (tipo) {
    case 'calvo':
      return null;
    case 'entradas':
      return (
        <path
          d={`M${50 - ancho} 30 q4 -14 ${ancho} -14 q${ancho - 4} 0 ${ancho} 14 q-6 -6 -13 -5 q-4 -4 -8 0 q-7 -1 -${ancho - 1} 5 Z`}
          fill={color}
        />
      );
    case 'raya':
      return (
        <path
          d={`M${50 - ancho} 32 q0 -18 ${ancho} -18 q${ancho} 0 ${ancho} 18 q-3 -10 -${ancho - 3} -11 q-6 3 -9 11 q-3 -8 -9 -6 Z`}
          fill={color}
        />
      );
    case 'rizado':
      return (
        <g fill={color}>
          <circle cx={50} cy={16} r={12} />
          <circle cx={36} cy={22} r={10} />
          <circle cx={64} cy={22} r={10} />
          <circle cx={30} cy={32} r={7} />
          <circle cx={70} cy={32} r={7} />
        </g>
      );
    case 'permanente':
      return (
        <g fill={color}>
          <ellipse cx={50} cy={20} rx={ancho + 4} ry={15} />
          <circle cx={50 - ancho - 1} cy={31} r={7.5} />
          <circle cx={50 + ancho + 1} cy={31} r={7.5} />
        </g>
      );
    case 'melena':
      return (
        <path
          d={`M${50 - ancho - 3} 56 q-3 -42 ${ancho + 3} -42 q${ancho + 3} 0 ${ancho + 3} 42 q-4 -22 -6 -26 q-8 6 -${ancho * 2 - 6} 0 q-2 4 -6 26 Z`}
          fill={color}
        />
      );
    case 'larga':
      return (
        <path
          d={`M${50 - ancho - 4} 78 q-4 -64 ${ancho + 4} -64 q${ancho + 4} 0 ${ancho + 4} 64 q-6 -40 -8 -48 q-8 6 -${ancho * 2 - 8} 0 q-2 8 -8 48 Z`}
          fill={color}
        />
      );
    case 'coleta':
      return (
        <g fill={color}>
          <path d={`M${50 - ancho} 30 q2 -16 ${ancho} -16 q${ancho - 2} 0 ${ancho} 16 q-8 -8 -${ancho} -8 q-${ancho - 2} 0 -${ancho} 8 Z`} />
          <ellipse cx={50 + ancho + 5} cy={40} rx={6} ry={13} />
        </g>
      );
    case 'mono':
      return (
        <g fill={color}>
          <path d={`M${50 - ancho} 30 q2 -16 ${ancho} -16 q${ancho - 2} 0 ${ancho} 16 q-8 -8 -${ancho} -8 q-${ancho - 2} 0 -${ancho} 8 Z`} />
          <circle cx={50} cy={9} r={8} />
        </g>
      );
    default:
      return (
        <path
          d={`M${50 - ancho} 32 q0 -18 ${ancho} -18 q${ancho} 0 ${ancho} 18 q-6 -10 -${ancho} -10 q-${ancho} 0 -${ancho} 10 Z`}
          fill={color}
        />
      );
  }
}

function Ropa({ tipo, color, ancho, y }: { tipo: string; color: string; ancho: number; y: number }) {
  const oscuro = '#00000033';
  const hombros = (
    <path
      d={`M${50 - ancho} 100 q0 -${100 - y} ${ancho} -${100 - y} q${ancho} 0 ${ancho} ${100 - y} Z`}
      fill={color}
    />
  );

  switch (tipo) {
    case 'camisa':
      return (
        <g>
          {hombros}
          <path d={`M${50 - 7} ${y} L50 ${y + 12} L${50 + 7} ${y} L${50 + 4} ${y - 2} L50 ${y + 5} L${50 - 4} ${y - 2} Z`} fill="#fbf8f1" />
          <path d={`M50 ${y + 12} L50 100`} stroke={oscuro} strokeWidth={1.4} />
        </g>
      );
    case 'traje':
      return (
        <g>
          {hombros}
          <path d={`M${50 - 8} ${y - 1} L50 ${y + 16} L${50 + 8} ${y - 1} L${50 + 3} ${y - 3} L50 ${y + 6} L${50 - 3} ${y - 3} Z`} fill="#fbf8f1" />
          <path d={`M50 ${y + 8} L${50 - 3} ${y + 16} L50 ${y + 20} L${50 + 3} ${y + 16} Z`} fill="#6d2233" />
        </g>
      );
    case 'chaqueta':
      return (
        <g>
          {hombros}
          <path d={`M${50 - 6} ${y} L${50 - 6} 100`} stroke={oscuro} strokeWidth={2} />
          <path d={`M${50 + 6} ${y} L${50 + 6} 100`} stroke={oscuro} strokeWidth={2} />
          <path d={`M${50 - 6} ${y} L50 ${y + 10} L${50 + 6} ${y} Z`} fill="#fbf8f1" opacity={0.9} />
        </g>
      );
    case 'jersey':
      return (
        <g>
          {hombros}
          <path d={`M${50 - 9} ${y + 1} q9 7 18 0`} stroke={oscuro} strokeWidth={2.4} fill="none" />
          <path d={`M${50 - ancho + 3} ${y + 14} L${50 + ancho - 3} ${y + 14}`} stroke={oscuro} strokeWidth={1.2} />
        </g>
      );
    case 'bata':
      return (
        <g>
          {hombros}
          <path d={`M${50 - 8} ${y} L50 ${y + 14} L${50 + 8} ${y}`} fill="none" stroke={oscuro} strokeWidth={2} />
          <g stroke="#ffffff55" strokeWidth={1}>
            <path d={`M${50 - ancho + 4} ${y + 8} L${50 - ancho + 4} 100`} />
            <path d={`M${50 + ancho - 4} ${y + 8} L${50 + ancho - 4} 100`} />
          </g>
          <circle cx={50} cy={y + 20} r={1.6} fill="#ffffffaa" />
        </g>
      );
    case 'mono':
      return (
        <g>
          {hombros}
          <path d={`M${50 - 10} ${y - 1} L${50 - 10} 100`} stroke={oscuro} strokeWidth={2.6} />
          <path d={`M${50 + 10} ${y - 1} L${50 + 10} 100`} stroke={oscuro} strokeWidth={2.6} />
          <rect x={50 - 10} y={y + 10} width={20} height={10} fill="#00000022" />
        </g>
      );
    case 'chandal':
      return (
        <g>
          {hombros}
          <path d={`M${50 - ancho + 2} ${y + 6} L${50 - ancho + 2} 100`} stroke="#fbf8f1" strokeWidth={2.4} />
          <path d={`M${50 + ancho - 2} ${y + 6} L${50 + ancho - 2} 100`} stroke="#fbf8f1" strokeWidth={2.4} />
        </g>
      );
    case 'blusa':
      return (
        <g>
          {hombros}
          <path d={`M${50 - 9} ${y} q9 12 18 0`} fill="#fbf8f1" opacity={0.55} />
          <circle cx={50} cy={y + 16} r={2} fill="#ffffff88" />
        </g>
      );
    case 'delantal':
      return (
        <g>
          {hombros}
          <path d={`M${50 - 11} ${y + 6} L${50 + 11} ${y + 6} L${50 + 13} 100 L${50 - 13} 100 Z`} fill="#fbf8f1" opacity={0.85} />
          <path d={`M${50 - 8} ${y + 6} L${50 - 4} ${y - 1}`} stroke="#fbf8f1" strokeWidth={2} />
          <path d={`M${50 + 8} ${y + 6} L${50 + 4} ${y - 1}`} stroke="#fbf8f1" strokeWidth={2} />
        </g>
      );
    default:
      return hombros;
  }
}

function Accesorio({ tipo, ancho, y }: { tipo: string; ancho: number; y: number }) {
  switch (tipo) {
    case 'gafas':
      return (
        <g fill="none" stroke="#2c2620" strokeWidth={1.8}>
          <circle cx={42} cy={38} r={7} />
          <circle cx={58} cy={38} r={7} />
          <path d="M49 38 L51 38" />
          <path d="M35 37 L30 35" />
          <path d="M65 37 L70 35" />
        </g>
      );
    case 'gafas-leer':
      return (
        <g fill="none" stroke="#6d2233" strokeWidth={2}>
          <rect x={34} y={40} width={14} height={9} rx={2} />
          <rect x={52} y={40} width={14} height={9} rx={2} />
          <path d="M48 44 L52 44" />
          <path d="M34 44 L28 41" />
          <path d="M66 44 L72 41" />
        </g>
      );
    case 'pendientes':
      return (
        <g fill="#e0a32b">
          <circle cx={28} cy={42} r={2.6} />
          <circle cx={72} cy={42} r={2.6} />
        </g>
      );
    case 'collar':
      return (
        <g>
          <path d={`M${50 - 9} ${y + 2} q9 9 18 0`} fill="none" stroke="#e0a32b" strokeWidth={1.8} />
          <circle cx={50} cy={y + 8} r={2.4} fill="#e0a32b" />
        </g>
      );
    case 'carpeta':
      return (
        <g>
          <rect x={50 + ancho - 12} y={y + 12} width={20} height={26} rx={2} fill="#c9a678" stroke="#2c2620" strokeWidth={1.4} />
          <g stroke="#2c2620" strokeWidth={1} opacity={0.55}>
            <path d={`M${50 + ancho - 8} ${y + 19} L${50 + ancho + 4} ${y + 19}`} />
            <path d={`M${50 + ancho - 8} ${y + 24} L${50 + ancho + 4} ${y + 24}`} />
            <path d={`M${50 + ancho - 8} ${y + 29} L${50 + ancho + 1} ${y + 29}`} />
          </g>
        </g>
      );
    case 'llaves':
      return (
        <g stroke="#8d8d86" strokeWidth={1.6} fill="none">
          <circle cx={50 + ancho + 2} cy={y + 16} r={3.5} />
          <path d={`M${50 + ancho + 2} ${y + 20} L${50 + ancho + 2} ${y + 30}`} />
          <path d={`M${50 + ancho + 2} ${y + 26} L${50 + ancho + 6} ${y + 26}`} />
          <path d={`M${50 + ancho - 2} ${y + 20} L${50 + ancho - 2} ${y + 28}`} />
        </g>
      );
    case 'movil':
      return (
        <rect x={50 + ancho - 6} y={y + 14} width={11} height={19} rx={2.5} fill="#2c2620" stroke="#8d8d86" strokeWidth={1} />
      );
    case 'fregona':
      return (
        <g>
          <path d={`M${50 + ancho + 4} ${y - 8} L${50 + ancho + 4} ${y + 26}`} stroke="#a07f52" strokeWidth={2.4} />
          <path d={`M${50 + ancho - 2} ${y + 26} L${50 + ancho + 10} ${y + 26} L${50 + ancho + 8} 100 L${50 + ancho} 100 Z`} fill="#d9cdb6" />
        </g>
      );
    case 'bolso':
      return (
        <g>
          <path d={`M${50 - ancho + 2} ${y + 4} L${50 - ancho - 4} ${y + 22}`} stroke="#6d2233" strokeWidth={2} fill="none" />
          <rect x={50 - ancho - 12} y={y + 22} width={17} height={14} rx={2} fill="#6d2233" />
        </g>
      );
    case 'panuelo':
      return <path d={`M${50 - 11} ${y + 1} q11 11 22 0 q-11 6 -22 0 Z`} fill="#a6301e" />;
    case 'auriculares':
      return (
        <g fill="none" stroke="#2c2620" strokeWidth={2.4}>
          <path d="M28 36 q22 -26 44 0" />
          <rect x={25} y={35} width={6} height={11} rx={3} fill="#2c2620" />
          <rect x={69} y={35} width={6} height={11} rx={3} fill="#2c2620" />
        </g>
      );
    default:
      return null;
  }
}

function Marco({ tipo }: { tipo: string }) {
  switch (tipo) {
    case 'placa':
      return <rect x={1.5} y={1.5} width={97} height={97} rx={3} fill="none" stroke="#8d8d86" strokeWidth={3} />;
    case 'buzon':
      return (
        <g fill="none">
          <rect x={2} y={2} width={96} height={96} rx={2} stroke="#a6301e" strokeWidth={4} />
          <rect x={34} y={6} width={32} height={4} rx={2} fill="#2c2620" />
        </g>
      );
    case 'oro':
      return (
        <g fill="none">
          <rect x={2} y={2} width={96} height={96} rx={4} stroke="#e0a32b" strokeWidth={5} />
          <rect x={6.5} y={6.5} width={87} height={87} rx={2} stroke="#ffffff77" strokeWidth={1.5} />
        </g>
      );
    default:
      return null;
  }
}

// ── Componente ──────────────────────────────────────────────────────────────────

export function Vecino({ config, tamano = 96, sinFondo = false, className, titulo }: Props) {
  const colores = coloresDe(config);
  const forma = CARA[config.cara] ?? CARA.ovalada!;
  const ancho = ANCHO_CUERPO[config.cuerpo] ?? 32;
  const desplazamiento = DESPLAZAMIENTO_ALTURA[config.altura] ?? 0;
  const yHombros = 72 + desplazamiento;

  // El pelo largo va DETRÁS de la cabeza; el corto, delante. Es la única capa que cambia de
  // orden y merece decirse en voz alta porque si no, la melena tapa la cara.
  const pelo = config.pelo;
  const peloDetras = pelo === 'melena' || pelo === 'larga' || pelo === 'permanente' || pelo === 'rizado';

  return (
    <svg
      viewBox="0 0 100 100"
      width={tamano}
      height={tamano}
      className={className}
      role={titulo ? 'img' : 'presentation'}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      style={{ display: 'block', borderRadius: '0.5rem', flexShrink: 0 }}
    >
      {!sinFondo ? (
        <>
          <rect width={100} height={100} fill={colores.fondo} />
          <circle cx={50} cy={64} r={40} fill={colores.fondo2} opacity={0.55} />
        </>
      ) : null}

      {/* Cuerpo, cuello y cabeza. */}
      <g transform={`translate(0 ${desplazamiento})`}>
        {peloDetras ? <Pelo tipo={pelo} color={colores.pelo} cara={config.cara} /> : null}

        <Ropa tipo={config.ropa} color={colores.ropa} ancho={ancho} y={yHombros - desplazamiento} />
        <rect x={44} y={56} width={12} height={14} fill={colores.pielSombra} />

        {config.cara === 'cuadrada' ? (
          <rect
            x={50 - forma.rx}
            y={forma.cy - forma.ry}
            width={forma.rx * 2}
            height={forma.ry * 2}
            rx={7}
            fill={colores.piel}
          />
        ) : (
          <ellipse cx={50} cy={forma.cy} rx={forma.rx} ry={forma.ry} fill={colores.piel} />
        )}

        {/* Orejas. */}
        <ellipse cx={50 - forma.rx} cy={forma.cy + 3} rx={3.4} ry={5} fill={colores.pielSombra} />
        <ellipse cx={50 + forma.rx} cy={forma.cy + 3} rx={3.4} ry={5} fill={colores.pielSombra} />

        {!peloDetras ? <Pelo tipo={pelo} color={colores.pelo} cara={config.cara} /> : null}

        <Cejas tipo={config.cejas} color={colores.pelo} />
        <Ojos tipo={config.ojos} />
        <Nariz tipo={config.nariz} color={colores.pielSombra} />
        <Boca tipo={config.boca} />

        <Accesorio tipo={config.accesorio} ancho={ancho} y={yHombros - desplazamiento} />
      </g>

      <Marco tipo={config.marco} />
    </svg>
  );
}
