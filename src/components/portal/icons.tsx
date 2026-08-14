/**
 * ICONOS DEL PORTAL — set de objetos domésticos y de comunidad, dibujados aquí.
 *
 * Son SVG propios y planos (dos o tres formas cada uno): ligeros, escalables y con el
 * mismo lenguaje gráfico que el resto de la interfaz. Se usan en los modos visuales
 * (¿QUÉ FALTA AQUÍ?, MEMORIA DE VECINO), en el tablón y en los avatares.
 *
 * Nada de fotogramas, imágenes promocionales ni iconos de terceros.
 */

export const IDS_ICONOS = [
  'buzon',
  'felpudo',
  'extintor',
  'maceta',
  'bombilla',
  'escoba',
  'cubo',
  'silla',
  'paraguas',
  'llave',
  'sobre',
  'periodico',
  'taza',
  'radio',
  'telefonillo',
  'reloj',
  'bicicleta',
  'bolsa',
  'caja',
  'contador',
  'papelera',
  'gato',
] as const;

export type IconoPortalId = (typeof IDS_ICONOS)[number];

type Dibujo = {
  etiqueta: string;
  cuerpo: React.ReactNode;
};

const TINTA = 'var(--color-tinta)';

/** Cada dibujo trabaja en una caja de 32×32 con trazo de 1.6. */
const DIBUJOS: Record<IconoPortalId, Dibujo> = {
  buzon: {
    etiqueta: 'Buzón',
    cuerpo: (
      <>
        <rect x="6" y="9" width="20" height="16" rx="1" fill="var(--color-rojo-buzon)" />
        <rect x="10" y="14" width="12" height="2" rx="1" fill={TINTA} opacity="0.65" />
        <path d="M6 9h20" stroke={TINTA} strokeWidth="1.6" />
        <path d="M12 25v3M20 25v3" stroke={TINTA} strokeWidth="1.6" />
      </>
    ),
  },
  felpudo: {
    etiqueta: 'Felpudo',
    cuerpo: (
      <>
        <rect x="4" y="13" width="24" height="10" rx="1" fill="var(--color-madera-clara)" />
        <path d="M8 13v10M12 13v10M16 13v10M20 13v10M24 13v10" stroke={TINTA} strokeWidth="1" opacity="0.5" />
      </>
    ),
  },
  extintor: {
    etiqueta: 'Extintor',
    cuerpo: (
      <>
        <rect x="11" y="10" width="10" height="18" rx="3" fill="var(--color-rojo-buzon)" />
        <rect x="14" y="5" width="4" height="5" fill="var(--color-metal)" />
        <path d="M18 7h5l-2 4" stroke={TINTA} strokeWidth="1.6" fill="none" />
        <rect x="12" y="16" width="8" height="4" fill="var(--color-papel)" opacity="0.85" />
      </>
    ),
  },
  maceta: {
    etiqueta: 'Maceta',
    cuerpo: (
      <>
        <path d="M11 18h10l-1.5 10h-7z" fill="var(--color-madera-clara)" />
        <path d="M16 18c0-5-3-7-6-8 1 5 3 7 6 8z" fill="var(--color-verde-claro)" />
        <path d="M16 18c0-4 3-6 6-7-1 4-3 6-6 7z" fill="var(--color-verde-portal)" />
      </>
    ),
  },
  bombilla: {
    etiqueta: 'Bombilla',
    cuerpo: (
      <>
        <circle cx="16" cy="14" r="7" fill="var(--color-mostaza-claro)" />
        <rect x="13" y="21" width="6" height="5" rx="1" fill="var(--color-metal)" />
        <path d="M13 24h6" stroke={TINTA} strokeWidth="1.2" />
      </>
    ),
  },
  escoba: {
    etiqueta: 'Escoba',
    cuerpo: (
      <>
        <path d="M20 4L12 20" stroke="var(--color-madera)" strokeWidth="2.6" />
        <path d="M8 19l8 4-3 6-8-4z" fill="var(--color-mostaza)" />
      </>
    ),
  },
  cubo: {
    etiqueta: 'Cubo',
    cuerpo: (
      <>
        <path d="M9 11h14l-2 16H11z" fill="var(--color-azul-claro)" />
        <path d="M9 11c0-3 14-3 14 0" stroke={TINTA} strokeWidth="1.6" fill="none" />
      </>
    ),
  },
  silla: {
    etiqueta: 'Silla',
    cuerpo: (
      <>
        <path d="M10 6h3v14h-3z" fill="var(--color-madera)" />
        <path d="M10 16h13v3H10z" fill="var(--color-madera-clara)" />
        <path d="M11 19l-1 8M22 19l1 8" stroke="var(--color-madera)" strokeWidth="2" />
      </>
    ),
  },
  paraguas: {
    etiqueta: 'Paraguas',
    cuerpo: (
      <>
        <path d="M4 16a12 8 0 0124 0z" fill="var(--color-granate)" />
        <path d="M16 16v10a3 3 0 006 0" stroke={TINTA} strokeWidth="1.8" fill="none" />
      </>
    ),
  },
  llave: {
    etiqueta: 'Llave',
    cuerpo: (
      <>
        <circle cx="11" cy="12" r="5" fill="none" stroke="var(--color-metal)" strokeWidth="3" />
        <path d="M15 15l10 10M21 21l3-3M24 24l2-2" stroke="var(--color-metal)" strokeWidth="3" />
      </>
    ),
  },
  sobre: {
    etiqueta: 'Sobre',
    cuerpo: (
      <>
        <rect x="5" y="9" width="22" height="15" rx="1" fill="var(--color-papel)" />
        <path d="M5 9l11 8 11-8" stroke={TINTA} strokeWidth="1.6" fill="none" />
      </>
    ),
  },
  periodico: {
    etiqueta: 'Periódico',
    cuerpo: (
      <>
        <rect x="5" y="8" width="22" height="17" rx="1" fill="var(--color-papel-viejo)" />
        <path d="M8 12h7M8 15h7M8 18h7M18 12h6M18 16h6M18 20h6" stroke={TINTA} strokeWidth="1.2" opacity="0.7" />
      </>
    ),
  },
  taza: {
    etiqueta: 'Taza',
    cuerpo: (
      <>
        <path d="M8 11h13v9a5 5 0 01-13 0z" fill="var(--color-papel)" />
        <path d="M21 13h4a3 3 0 010 6h-4" stroke={TINTA} strokeWidth="1.6" fill="none" />
        <path d="M8 11h13" stroke={TINTA} strokeWidth="1.6" />
      </>
    ),
  },
  radio: {
    etiqueta: 'Radio',
    cuerpo: (
      <>
        <rect x="5" y="12" width="22" height="13" rx="2" fill="var(--color-madera-clara)" />
        <circle cx="11" cy="18" r="3.5" fill="var(--color-tinta)" opacity="0.75" />
        <path d="M19 15h5M19 18h5M19 21h5" stroke={TINTA} strokeWidth="1.2" />
        <path d="M22 12l4-6" stroke={TINTA} strokeWidth="1.6" />
      </>
    ),
  },
  telefonillo: {
    etiqueta: 'Telefonillo',
    cuerpo: (
      <>
        <rect x="9" y="5" width="14" height="22" rx="2" fill="var(--color-metal-claro)" />
        <circle cx="16" cy="11" r="3" fill="var(--color-tinta)" opacity="0.7" />
        <rect x="12" y="17" width="8" height="2" fill={TINTA} opacity="0.6" />
        <rect x="12" y="21" width="8" height="2" fill={TINTA} opacity="0.6" />
      </>
    ),
  },
  reloj: {
    etiqueta: 'Reloj',
    cuerpo: (
      <>
        <circle cx="16" cy="16" r="11" fill="var(--color-papel)" stroke={TINTA} strokeWidth="1.6" />
        <path d="M16 9v7l5 3" stroke={TINTA} strokeWidth="1.8" fill="none" />
      </>
    ),
  },
  bicicleta: {
    etiqueta: 'Bicicleta',
    cuerpo: (
      <>
        <circle cx="9" cy="21" r="5" fill="none" stroke={TINTA} strokeWidth="1.8" />
        <circle cx="23" cy="21" r="5" fill="none" stroke={TINTA} strokeWidth="1.8" />
        <path d="M9 21l5-9h6l3 9M14 12h6" stroke="var(--color-azul-impreso)" strokeWidth="1.8" fill="none" />
      </>
    ),
  },
  bolsa: {
    etiqueta: 'Bolsa',
    cuerpo: (
      <>
        <path d="M8 12h16l-2 15H10z" fill="var(--color-mostaza)" />
        <path d="M12 12a4 4 0 018 0" stroke={TINTA} strokeWidth="1.6" fill="none" />
      </>
    ),
  },
  caja: {
    etiqueta: 'Caja',
    cuerpo: (
      <>
        <rect x="6" y="11" width="20" height="15" fill="var(--color-madera-clara)" />
        <path d="M6 16h20" stroke={TINTA} strokeWidth="1.4" />
        <path d="M14 11v15" stroke={TINTA} strokeWidth="1.4" opacity="0.6" />
        <rect x="12" y="7" width="8" height="4" fill="var(--color-papel-viejo)" />
      </>
    ),
  },
  contador: {
    etiqueta: 'Contador',
    cuerpo: (
      <>
        <rect x="6" y="8" width="20" height="17" rx="1" fill="var(--color-metal-claro)" />
        <rect x="9" y="12" width="14" height="6" fill="var(--color-crt)" />
        <path d="M11 15h10" stroke="var(--color-crt-verde)" strokeWidth="1.6" />
        <circle cx="12" cy="22" r="1.6" fill="var(--color-rojo-buzon)" />
      </>
    ),
  },
  papelera: {
    etiqueta: 'Papelera',
    cuerpo: (
      <>
        <path d="M10 11h12l-1.5 15h-9z" fill="var(--color-metal)" />
        <path d="M8 11h16" stroke={TINTA} strokeWidth="1.8" />
        <path d="M14 8h4v3h-4z" fill={TINTA} opacity="0.6" />
      </>
    ),
  },
  gato: {
    etiqueta: 'Gato',
    cuerpo: (
      <>
        <path d="M10 16l-2-6 5 3zM22 16l2-6-5 3z" fill="var(--color-tinta-suave)" />
        <circle cx="16" cy="19" r="7" fill="var(--color-tinta-suave)" />
        <circle cx="13" cy="18" r="1.2" fill="var(--color-mostaza-claro)" />
        <circle cx="19" cy="18" r="1.2" fill="var(--color-mostaza-claro)" />
        <path d="M14 22h4" stroke="var(--color-papel)" strokeWidth="1.2" />
      </>
    ),
  },
};

export function etiquetaIcono(id: string): string {
  return DIBUJOS[id as IconoPortalId]?.etiqueta ?? id;
}

export function esIconoPortal(id: string): id is IconoPortalId {
  return id in DIBUJOS;
}

/** Icono del portal. `tamano` en píxeles; hereda color donde procede. */
export function PortalIcon({
  id,
  tamano = 32,
  className = '',
  titulo,
}: {
  id: string;
  tamano?: number;
  className?: string;
  titulo?: string;
}) {
  const dibujo = DIBUJOS[id as IconoPortalId];
  if (!dibujo) {
    return (
      <span className={className} aria-hidden style={{ fontSize: tamano * 0.8 }}>
        ▪
      </span>
    );
  }

  return (
    <svg
      viewBox="0 0 32 32"
      width={tamano}
      height={tamano}
      className={className}
      role={titulo ? 'img' : undefined}
      aria-hidden={titulo ? undefined : true}
      aria-label={titulo}
    >
      {titulo ? <title>{titulo}</title> : null}
      {dibujo.cuerpo}
    </svg>
  );
}
