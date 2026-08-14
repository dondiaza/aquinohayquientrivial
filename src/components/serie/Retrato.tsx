/**
 * RETRATO DE VECINO — dibujo ORIGINAL, no un parecido.
 *
 * Cada vecino de Desengaño 21 necesita una cara en la web, y la cara no puede ser un
 * fotograma de la serie (ver `src/content/imagenes.ts`). La solución es la misma que ya
 * usa el avatar del jugador: piezas geométricas propias —cabeza, pelo, hombros y un
 * complemento— combinadas de forma determinista a partir del nombre.
 *
 * A propósito NO se busca el parecido: son siluetas de portal, no caricaturas de las
 * personas que interpretaron a los personajes. Lo que identifica a cada vecino es el
 * color, la silueta y la placa con su piso, no la cara.
 *
 * Determinista: el mismo nombre da siempre el mismo retrato, así que el reparto se ve
 * igual en todas las pantallas y entre despliegues.
 */

const TINTA = '#23201b';
const PIEL = '#e8c9a8';
const PIEL_SOMBRA = '#d0ad8b';

const PALETAS: Record<string, { ropa: string; pelo: string }> = {
  verde: { ropa: '#1e4b3e', pelo: '#3a2a1f' },
  rojo: { ropa: '#c94a34', pelo: '#6b3b22' },
  granate: { ropa: '#6d2233', pelo: '#4a4a52' },
  mostaza: { ropa: '#e0a32b', pelo: '#23201b' },
  azul: { ropa: '#23557e', pelo: '#23201b' },
  morado: { ropa: '#55385f', pelo: '#8a6a3a' },
  naranja: { ropa: '#e0662b', pelo: '#3a2a1f' },
  tinta: { ropa: '#5b544a', pelo: '#9aa0a6' },
};

/** Huella estable del nombre: decide pelo, complemento y guiño. */
function huella(nombre: string): number {
  let valor = 0x811c9dc5;
  for (let indice = 0; indice < nombre.length; indice += 1) {
    valor ^= nombre.charCodeAt(indice);
    valor = Math.imul(valor, 0x01000193);
  }
  return valor >>> 0;
}

function Pelo({ forma, color }: { forma: number; color: string }) {
  switch (forma) {
    case 0: // corto con raya
      return (
        <>
          <path d="M17 27c0-10 7-15 15-15s15 5 15 15c0-4-6-7-15-7s-15 3-15 7z" fill={color} />
          <path d="M24 15c4-3 12-3 16 1" stroke={TINTA} strokeWidth="1" fill="none" opacity="0.5" />
        </>
      );
    case 1: // moño alto
      return (
          <>
          <circle cx="32" cy="9" r="5" fill={color} />
          <path d="M17 28c0-11 7-16 15-16s15 5 15 16c0-5-6-8-15-8s-15 3-15 8z" fill={color} />
        </>
      );
    case 2: // rizado voluminoso
      return (
        <>
          <circle cx="21" cy="20" r="7" fill={color} />
          <circle cx="32" cy="14" r="8" fill={color} />
          <circle cx="43" cy="20" r="7" fill={color} />
          <path d="M17 28c0-8 7-12 15-12s15 4 15 12c0-4-6-6-15-6s-15 2-15 6z" fill={color} />
        </>
      );
    case 3: // media melena
      return (
        <>
          <path d="M16 30c0-12 7-18 16-18s16 6 16 18l-3 8V26c0-5-6-8-13-8s-13 3-13 8v12z" fill={color} />
        </>
      );
    case 4: // entradas
      return (
        <path d="M19 26c1-9 7-13 13-13s12 4 13 13c-2-6-7-8-13-8-3 0-6 1-8 2z" fill={color} />
      );
    default: // repeinado
      return (
        <>
          <path d="M17 26c0-10 7-15 15-15s15 5 15 15c0-5-5-9-11-9-6 0-13 3-19 9z" fill={color} />
        </>
      );
  }
}

function Complemento({ forma, color }: { forma: number; color: string }) {
  switch (forma) {
    case 0: // gafas
      return (
        <>
          <circle cx="26" cy="34" r="5.5" fill="none" stroke={TINTA} strokeWidth="1.8" />
          <circle cx="40" cy="34" r="5.5" fill="none" stroke={TINTA} strokeWidth="1.8" />
          <path d="M31.5 34h3" stroke={TINTA} strokeWidth="1.8" />
        </>
      );
    case 1: // bigote
      return <path d="M27 40c2-2 8-2 10 0-2 2-8 2-10 0z" fill={TINTA} opacity="0.8" />;
    case 2: // pendientes
      return (
        <>
          <circle cx="18.5" cy="34" r="2" fill={color} stroke={TINTA} strokeWidth="0.8" />
          <circle cx="45.5" cy="34" r="2" fill={color} stroke={TINTA} strokeWidth="0.8" />
        </>
      );
    case 3: // pañuelo al cuello
      return (
        <path d="M23 47c4 5 14 5 18 0l-3 6H26z" fill={color} stroke={TINTA} strokeWidth="0.8" />
      );
    case 4: // collar de perlas
      return (
        <>
          {[26, 30, 34, 38].map((x) => (
            <circle key={x} cx={x} cy={49 + Math.abs(32 - x) * 0.25} r="1.6" fill="#f7f2e6" stroke={TINTA} strokeWidth="0.5" />
          ))}
        </>
      );
    default: // cuello de camisa
      return (
        <>
          <path d="M27 45l5 5 5-5" fill="none" stroke="#f7f2e6" strokeWidth="2.5" />
        </>
      );
  }
}

export function Retrato({
  nombre,
  paleta = 'verde',
  tamano = 64,
  className = '',
}: {
  nombre: string;
  paleta?: string;
  tamano?: number;
  className?: string;
}) {
  const marca = huella(nombre);
  const colores = PALETAS[paleta] ?? PALETAS.verde;
  const ropa = colores?.ropa ?? '#1e4b3e';
  const pelo = colores?.pelo ?? '#3a2a1f';

  const formaPelo = marca % 6;
  const formaComplemento = (marca >> 3) % 6;
  const anchoCara = 13 + ((marca >> 7) % 3);

  return (
    <svg
      viewBox="0 0 64 68"
      width={tamano}
      height={(tamano * 68) / 64}
      className={className}
      role="img"
      aria-label={`Retrato ilustrado de ${nombre}`}
    >
      {/* Hombros */}
      <path d="M6 68c0-12 11-19 26-19s26 7 26 19z" fill={ropa} stroke={TINTA} strokeWidth="1.5" />

      {/* Cuello */}
      <path d="M28 42h8v9h-8z" fill={PIEL_SOMBRA} />

      {/* Cara */}
      <ellipse cx="32" cy="32" rx={anchoCara} ry="16" fill={PIEL} stroke={TINTA} strokeWidth="1.4" />
      {/* Ojos y boca: dos puntos y una línea, sin intención de parecido */}
      <circle cx="27" cy="31" r="1.5" fill={TINTA} />
      <circle cx="37" cy="31" r="1.5" fill={TINTA} />
      <path d="M29 39c2 1.5 4 1.5 6 0" stroke={TINTA} strokeWidth="1.3" fill="none" strokeLinecap="round" />

      <Pelo forma={formaPelo} color={pelo} />
      <Complemento forma={formaComplemento} color={ropa} />
    </svg>
  );
}

/** Fila de retratos: se usa en la ficha de una zona y en las cabeceras. */
export function FilaDeRetratos({
  vecinos,
  tamano = 44,
}: {
  vecinos: readonly { nombre: string; paleta?: string }[];
  tamano?: number;
}) {
  return (
    <div className="flex flex-wrap items-end gap-1">
      {vecinos.map((vecino) => (
        <Retrato
          key={vecino.nombre}
          nombre={vecino.nombre}
          {...(vecino.paleta ? { paleta: vecino.paleta } : {})}
          tamano={tamano}
        />
      ))}
    </div>
  );
}
