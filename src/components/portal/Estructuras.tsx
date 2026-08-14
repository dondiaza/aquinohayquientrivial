/**
 * ESTRUCTURAS DEL EDIFICIO — los componentes que convierten la interfaz en portal.
 *
 * Todos son presentacionales: reciben datos y no contienen reglas de juego.
 * Traducción diegética (docs/DESIGN-SYSTEM.md §1): puerta = modo, telefonillo = sala,
 * ascensor = progreso, tablón = avisos, buzones = pistas, placa = título.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

// ── Placa de vivienda: el título de cualquier pantalla ───────────────────────

export function ApartmentPlaque({
  vivienda,
  titulo,
  subtitulo,
  tono = 'verde',
  className = '',
}: {
  /** Texto pequeño superior, tipo «4ºB» o «Junta ordinaria». */
  vivienda?: string;
  titulo: string;
  subtitulo?: string;
  tono?: 'verde' | 'azul' | 'roja' | 'morada' | 'granate';
  className?: string;
}) {
  const claseTono =
    tono === 'azul'
      ? 'placa-azul'
      : tono === 'roja'
        ? 'placa-roja'
        : tono === 'morada'
          ? 'placa-morada'
          : tono === 'granate'
            ? 'placa-granate'
            : '';

  return (
    <div className={`placa px-5 py-4 pt-6 ${claseTono} ${className}`}>
      {vivienda ? <p className="texto-sello text-mostaza-claro">{vivienda}</p> : null}
      <h1 className="text-[clamp(1.6rem,6vw,3rem)]">{titulo}</h1>
      {subtitulo ? <p className="texto-sello mt-1 normal-case opacity-90">{subtitulo}</p> : null}
    </div>
  );
}

// ── Cabecera del edificio ────────────────────────────────────────────────────

export function BuildingHeader({
  numero,
  nombre,
  direccion,
  acciones,
}: {
  numero: string;
  nombre: string;
  direccion: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="azulejo">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group flex items-center gap-3">
          <span
            aria-hidden
            className="metal flex h-10 w-10 items-center justify-center text-lg font-bold text-tinta"
            style={{ fontFamily: 'var(--font-cartel)' }}
          >
            {numero}
          </span>
          <span className="leading-tight">
            <span className="texto-cartel block text-lg text-verde-portal sm:text-xl">{nombre}</span>
            <span className="texto-sello block text-[0.62rem] text-verde-portal/80">{direccion}</span>
          </span>
        </Link>
        {acciones}
      </div>
    </div>
  );
}

// ── Puerta = modo de juego ───────────────────────────────────────────────────

export function DoorCard({
  titulo,
  descripcion,
  etiqueta,
  numero,
  href,
  onClick,
  deshabilitada = false,
  tono = 'verde',
  className = '',
}: {
  titulo: string;
  descripcion?: string;
  /** Chip inferior, p. ej. «Próximamente». */
  etiqueta?: string;
  /** Número o letra de la puerta. */
  numero?: string;
  href?: string;
  onClick?: () => void;
  deshabilitada?: boolean;
  tono?: 'verde' | 'granate';
  className?: string;
}) {
  const contenido = (
    <>
      {/* Cuarterones */}
      <span aria-hidden className="pointer-events-none absolute inset-3 grid grid-rows-2 gap-3">
        <span className="puerta-panel" />
        <span className="puerta-panel" />
      </span>

      {/* Mirilla y placa */}
      <span aria-hidden className="absolute left-1/2 top-3 -translate-x-1/2">
        <span className="mirilla block" />
      </span>

      {numero ? (
        <span
          aria-hidden
          className="metal absolute right-3 top-3 px-1.5 py-0.5 text-[0.7rem] font-bold text-tinta"
          style={{ fontFamily: 'var(--font-sello)' }}
        >
          {numero}
        </span>
      ) : null}

      <span className="relative z-10 mt-auto block">
        <span className="texto-cartel block text-[clamp(1.1rem,4vw,1.6rem)] leading-none">
          {titulo}
        </span>
        {descripcion ? (
          <span className="mt-1 block text-xs leading-snug opacity-85">{descripcion}</span>
        ) : null}
        {etiqueta ? <span className="chip mt-2 inline-flex border-papel/40">{etiqueta}</span> : null}
      </span>

      {/* Felpudo */}
      <span
        aria-hidden
        className="absolute -bottom-2 left-1/2 h-2 w-2/3 -translate-x-1/2 rounded-sm bg-madera-clara shadow-[2px_2px_0_rgba(35,32,27,0.3)]"
      />
    </>
  );

  const clases = `puerta relative flex min-h-44 flex-col p-4 text-left ${
    tono === 'granate' ? 'bg-granate' : ''
  } ${className}`;

  if (deshabilitada) {
    return (
      <div className={clases} aria-disabled="true">
        {contenido}
      </div>
    );
  }

  if (href) {
    return (
      <Link href={href} className={clases}>
        {contenido}
      </Link>
    );
  }

  return (
    <button type="button" className={clases} onClick={onClick}>
      {contenido}
    </button>
  );
}

// ── Telefonillo = salas (Fase 3) ─────────────────────────────────────────────

export function IntercomPanel({
  titulo = 'Telefonillo',
  descripcion,
  etiqueta,
  href,
  deshabilitado = false,
  timbres,
}: {
  titulo?: string;
  descripcion?: string;
  etiqueta?: string;
  href?: string;
  deshabilitado?: boolean;
  /** Nombres de los timbres, para decorar. */
  timbres?: string[];
}) {
  const cuerpo = (
    <>
      <p className="texto-sello text-tinta">{titulo}</p>
      <div className="mt-2 space-y-1">
        {(timbres ?? ['4ºB', '3ºA', '2ºB', 'Bajo C']).map((timbre) => (
          <span key={timbre} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-3 w-3 flex-none rounded-full border border-tinta/60 bg-rojo-buzon/80"
            />
            <span className="texto-sello text-[0.6rem] text-tinta/80">{timbre}</span>
          </span>
        ))}
      </div>
      {descripcion ? <p className="mt-2 text-xs text-tinta/80">{descripcion}</p> : null}
      {etiqueta ? <span className="chip mt-2">{etiqueta}</span> : null}
    </>
  );

  const clases = `metal block w-full p-3 text-left ${deshabilitado ? 'opacity-70' : 'hover:brightness-105'}`;

  if (deshabilitado || !href) {
    return (
      <div className={clases} aria-disabled={deshabilitado ? 'true' : undefined}>
        {cuerpo}
      </div>
    );
  }
  return (
    <Link href={href} className={clases}>
      {cuerpo}
    </Link>
  );
}

// ── Ascensor = progreso de la partida ────────────────────────────────────────

export function ElevatorDisplay({
  planta,
  plantas,
  averiado = false,
  etiqueta,
  compacto = false,
}: {
  /** Planta actual (0 = bajo). */
  planta: number;
  plantas: number;
  averiado?: boolean;
  etiqueta?: string;
  compacto?: boolean;
}) {
  const numeroPlanta = averiado ? '--' : planta === 0 ? 'B' : String(planta);

  return (
    <div className={`metal flex items-center gap-3 ${compacto ? 'p-1.5' : 'p-2.5'}`}>
      <div
        className={`crt flex items-center justify-center ${compacto ? 'h-8 w-10' : 'h-11 w-14'}`}
        role="img"
        aria-label={
          averiado
            ? 'Ascensor averiado'
            : `Ascensor en la planta ${numeroPlanta} de ${plantas}`
        }
      >
        <span
          className={`relative z-10 ${compacto ? 'text-base' : 'text-2xl'} ${averiado ? 'text-rojo-claro' : ''}`}
          style={{ fontFamily: 'var(--font-cartel)' }}
        >
          {numeroPlanta}
        </span>
      </div>

      {/* Columna de plantas */}
      <div className="flex flex-col-reverse gap-0.5" aria-hidden>
        {Array.from({ length: plantas + 1 }, (_, indice) => (
          <span
            key={indice}
            className={`h-1.5 w-5 border border-tinta/40 ${
              indice <= planta && !averiado ? 'bg-mostaza' : 'bg-tinta/10'
            }`}
          />
        ))}
      </div>

      {etiqueta && !compacto ? (
        <span className="texto-sello text-[0.6rem] text-tinta/80">{etiqueta}</span>
      ) : null}
    </div>
  );
}

// ── Tablón de anuncios ───────────────────────────────────────────────────────

export function NoticeBoard({
  titulo,
  children,
  className = '',
}: {
  titulo?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`tablon p-4 sm:p-5 ${className}`}>
      {titulo ? (
        <p
          className="mx-auto mb-3 w-fit border-2 border-tinta bg-papel px-3 py-1 text-center text-sm"
          style={{ fontFamily: 'var(--font-cartel)', textTransform: 'uppercase' }}
        >
          {titulo}
        </p>
      ) : null}
      {children}
    </div>
  );
}

export function PaperNotice({
  children,
  tono = 'mostaza',
  giro = 'ninguno',
  sujecion,
  aMano = false,
  className = '',
}: {
  children: ReactNode;
  tono?: 'mostaza' | 'papel' | 'azul' | 'verde' | 'rosa';
  giro?: 'ninguno' | 'izq' | 'der';
  sujecion?: 'cinta' | 'chincheta';
  /** Escrito a mano (para rumores y notas de vecinos). */
  aMano?: boolean;
  className?: string;
}) {
  const claseTono =
    tono === 'papel'
      ? 'nota-papel'
      : tono === 'azul'
        ? 'nota-azul'
        : tono === 'verde'
          ? 'nota-verde'
          : tono === 'rosa'
            ? 'nota-rosa'
            : '';
  const claseGiro = giro === 'izq' ? 'girada-izq' : giro === 'der' ? 'girada-der' : '';
  const claseSujecion =
    sujecion === 'cinta' ? 'con-cinta' : sujecion === 'chincheta' ? 'con-chincheta' : '';

  return (
    <div
      className={`nota ${claseTono} ${claseGiro} ${claseSujecion} ${aMano ? 'escrito-a-mano' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

// ── Sello de la comunidad ────────────────────────────────────────────────────

export function CommunityStamp({
  titulo,
  linea,
  rareza = 'comun',
  animado = false,
  className = '',
}: {
  titulo: string;
  linea?: string;
  rareza?: 'comun' | 'curioso' | 'raro' | 'legendario';
  animado?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`sello-grande rareza-${rareza} ${animado ? 'anim-sellar' : ''} ${className}`}
      style={{ minWidth: '5.5rem', minHeight: '5.5rem' }}
    >
      <span className="text-[0.6rem] opacity-80">Comunidad</span>
      <span className="text-[0.8rem] font-bold leading-tight">{titulo}</span>
      {linea ? <span className="text-[0.55rem] opacity-80">{linea}</span> : null}
    </span>
  );
}
