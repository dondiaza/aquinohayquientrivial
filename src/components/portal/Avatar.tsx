/**
 * AVATAR DE VECINO — dibujo original compuesto por piezas.
 *
 * Cabeza + hombros + complemento del arquetipo. No hay parecido con ninguna persona
 * real: son siluetas genéricas de comunidad de vecinos. El marco depende del rango.
 */

import { getColorAvatar, getMarco, type ArquetipoId } from '@/domain/players/avatar';

const PIEL = '#e8c9a8';
const PIEL_SOMBRA = '#d0ad8b';
const TINTA = '#23201b';

function Complemento({ arquetipo, color }: { arquetipo: ArquetipoId; color: string }) {
  switch (arquetipo) {
    case 'presidente':
      // Corbata y carpeta de tapas rojas.
      return (
        <>
          <path d="M32 44l4 4-4 12-4-12z" fill="#a6301e" />
          <rect x="44" y="46" width="14" height="18" rx="1" fill="#a6301e" stroke={TINTA} strokeWidth="1.5" />
          <path d="M44 54h14" stroke="#f7f2e6" strokeWidth="1.5" />
        </>
      );
    case 'porteria':
      // Gorra de portería.
      return (
        <>
          <path d="M18 26c0-9 6-14 14-14s14 5 14 14z" fill={color} />
          <path d="M14 26h24l6 4H14z" fill={color} stroke={TINTA} strokeWidth="1.5" />
          <path d="M28 20h8v4h-8z" fill="#f7f2e6" opacity="0.85" />
        </>
      );
    case 'estudiante':
      // Auriculares de casco.
      return (
        <>
          <path d="M17 30a15 15 0 0130 0" stroke={TINTA} strokeWidth="3" fill="none" />
          <rect x="13" y="28" width="7" height="12" rx="3" fill={TINTA} />
          <rect x="44" y="28" width="7" height="12" rx="3" fill={TINTA} />
        </>
      );
    case 'jubilacion':
      // Boina y gafas.
      return (
        <>
          <path d="M17 27c0-9 7-14 15-14s15 5 15 14z" fill="#4a4a52" />
          <circle cx="47" cy="16" r="2.5" fill="#4a4a52" />
          <circle cx="26" cy="35" r="6" fill="none" stroke={TINTA} strokeWidth="2" />
          <circle cx="40" cy="35" r="6" fill="none" stroke={TINTA} strokeWidth="2" />
          <path d="M32 35h2" stroke={TINTA} strokeWidth="2" />
        </>
      );
    case 'oficina':
      // Maletín y corbata fina.
      return (
        <>
          <path d="M32 44l3 3-3 11-3-11z" fill="#23557e" />
          <rect x="42" y="50" width="16" height="12" rx="1" fill="#4a3428" stroke={TINTA} strokeWidth="1.5" />
          <path d="M48 50v-3h4v3" stroke={TINTA} strokeWidth="1.5" fill="none" />
        </>
      );
    case 'elegante':
      // Pañuelo al cuello y perla.
      return (
        <>
          <path d="M22 46c4 6 16 6 20 0l-4 8H26z" fill="#c94a34" />
          <circle cx="32" cy="52" r="2.5" fill="#f7f2e6" stroke={TINTA} strokeWidth="1" />
          <path d="M18 24c4-8 24-8 28 0" stroke="#3a2a1f" strokeWidth="6" fill="none" />
        </>
      );
    case 'manitas':
      // Gorra al revés y llave inglesa.
      return (
        <>
          <path d="M18 26c0-9 6-14 14-14s14 5 14 14z" fill={color} />
          <path d="M18 26h-5l3 4h4z" fill={color} stroke={TINTA} strokeWidth="1.5" />
          <path d="M46 44l10 12" stroke="#9aa0a6" strokeWidth="5" strokeLinecap="round" />
          <circle cx="46" cy="43" r="4" fill="none" stroke="#9aa0a6" strokeWidth="4" />
        </>
      );
    case 'administracion':
      // Gafas y carpeta azul de circulares.
      return (
        <>
          <rect x="20" y="30" width="12" height="9" rx="1" fill="none" stroke={TINTA} strokeWidth="2" />
          <rect x="34" y="30" width="12" height="9" rx="1" fill="none" stroke={TINTA} strokeWidth="2" />
          <path d="M32 34h2" stroke={TINTA} strokeWidth="2" />
          <rect x="42" y="46" width="15" height="18" rx="1" fill="#23557e" stroke={TINTA} strokeWidth="1.5" />
          <path d="M45 52h9M45 56h9" stroke="#f7f2e6" strokeWidth="1.2" />
        </>
      );
  }
}

const CLASE_MARCO: Record<string, string> = {
  ninguno: 'border-2 border-linea-fuerte bg-papel',
  metal: 'metal',
  madera: 'border-4 border-madera bg-madera-clara',
  azulejo: 'azulejo border-2 border-verde-portal',
  dorado: 'border-4 border-double border-mostaza bg-papel shadow-[0_0_12px_rgba(224,163,43,0.55)]',
};

export function NeighbourAvatar({
  arquetipo,
  color,
  marco = 'ninguno',
  tamano = 72,
  className = '',
  etiqueta,
}: {
  arquetipo: ArquetipoId;
  color: string;
  marco?: string;
  tamano?: number;
  className?: string;
  etiqueta?: string;
}) {
  const colorRopa = getColorAvatar(color).valor;
  const claseMarco = CLASE_MARCO[getMarco(marco).id] ?? CLASE_MARCO.ninguno;

  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden ${claseMarco} ${className}`}
      style={{ width: tamano, height: tamano, borderRadius: 4 }}
      role="img"
      aria-label={etiqueta ?? 'Avatar de vecino'}
    >
      <svg viewBox="0 0 64 64" width={tamano - 8} height={tamano - 8} aria-hidden>
        {/* Hombros */}
        <path d="M8 64c0-13 11-20 24-20s24 7 24 20z" fill={colorRopa} />
        {/* Cuello */}
        <path d="M28 40h8v8h-8z" fill={PIEL_SOMBRA} />
        {/* Cabeza */}
        <circle cx="32" cy="30" r="14" fill={PIEL} />
        {/* Orejas */}
        <circle cx="18" cy="31" r="2.5" fill={PIEL_SOMBRA} />
        <circle cx="46" cy="31" r="2.5" fill={PIEL_SOMBRA} />
        {/* Ojos y boca, muy esquemáticos */}
        <circle cx="27" cy="30" r="1.6" fill={TINTA} />
        <circle cx="37" cy="30" r="1.6" fill={TINTA} />
        <path d="M28 37c2.5 2 5.5 2 8 0" stroke={TINTA} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <Complemento arquetipo={arquetipo} color={colorRopa} />
      </svg>
    </span>
  );
}
