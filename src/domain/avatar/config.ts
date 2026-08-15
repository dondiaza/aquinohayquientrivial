/**
 * TU VECINO — catálogo de piezas y configuración.
 *
 * ## Dos decisiones de fondo
 *
 * 1. **Se guarda la CONFIGURACIÓN, no una imagen.** Un PNG no se puede volver a editar, pesa,
 *    hay que servirlo y caduca cuando cambia el estilo. Una lista de piezas se edita, ocupa
 *    doscientos bytes y se puede repintar mejor mañana sin migrar nada.
 * 2. **Todo es original.** Ninguna pieza imita la cara de nadie real. Son arquetipos de
 *    comunidad de vecinos —la bata, la carpeta de la presidencia, el mono de trabajo, las
 *    gafas de leer el acta—, que es lo que da el ambiente sin usar la imagen de una persona.
 *
 * El render es DETERMINISTA: la misma configuración da exactamente el mismo dibujo en el
 * móvil, en la tele y dentro de dos años.
 */

import { z } from 'zod';

type Pieza = { id: string; label: string };

/** Constitución. Nombres neutros: no se describe el cuerpo de nadie, se describe una silueta. */
export const CUERPOS: readonly Pieza[] = [
  { id: 'estrecho', label: 'Espigado' },
  { id: 'medio', label: 'Normal' },
  { id: 'ancho', label: 'Ancho' },
];

export const ALTURAS: readonly Pieza[] = [
  { id: 'baja', label: 'Bajita' },
  { id: 'media', label: 'Media' },
  { id: 'alta', label: 'Alta' },
];

export const CARAS: readonly Pieza[] = [
  { id: 'ovalada', label: 'Ovalada' },
  { id: 'redonda', label: 'Redonda' },
  { id: 'cuadrada', label: 'Cuadrada' },
  { id: 'alargada', label: 'Alargada' },
];

export const TONOS_PIEL: readonly (Pieza & { hex: string; sombra: string })[] = [
  { id: 'clara', label: 'Clara', hex: '#f2d6bd', sombra: '#dcbb9d' },
  { id: 'media', label: 'Media', hex: '#e8c9a8', sombra: '#d0ad8b' },
  { id: 'tostada', label: 'Tostada', hex: '#c99a6e', sombra: '#ab7d55' },
  { id: 'morena', label: 'Morena', hex: '#a2713f', sombra: '#84592f' },
  { id: 'oscura', label: 'Oscura', hex: '#6d4426', sombra: '#54331b' },
  { id: 'muy-oscura', label: 'Muy oscura', hex: '#472a17', sombra: '#331d0f' },
];

export const CEJAS: readonly Pieza[] = [
  { id: 'rectas', label: 'Rectas' },
  { id: 'arqueadas', label: 'Arqueadas' },
  { id: 'pobladas', label: 'Pobladas' },
  { id: 'finas', label: 'Finas' },
  { id: 'enfadadas', label: 'De junta' },
];

export const OJOS: readonly Pieza[] = [
  { id: 'normales', label: 'Normales' },
  { id: 'grandes', label: 'Grandes' },
  { id: 'entornados', label: 'Entornados' },
  { id: 'alegres', label: 'Alegres' },
  { id: 'cansados', label: 'De guardia' },
];

export const NARICES: readonly Pieza[] = [
  { id: 'recta', label: 'Recta' },
  { id: 'chata', label: 'Chata' },
  { id: 'aguilena', label: 'Aguileña' },
  { id: 'redonda', label: 'Redonda' },
];

export const BOCAS: readonly Pieza[] = [
  { id: 'neutra', label: 'Neutra' },
  { id: 'sonrisa', label: 'Sonrisa' },
  { id: 'media-sonrisa', label: 'Media sonrisa' },
  { id: 'seria', label: 'Seria' },
  { id: 'protesta', label: 'De protesta' },
];

export const PELOS: readonly Pieza[] = [
  { id: 'corto', label: 'Corto' },
  { id: 'raya', label: 'Con raya' },
  { id: 'rizado', label: 'Rizado' },
  { id: 'melena', label: 'Media melena' },
  { id: 'larga', label: 'Larga' },
  { id: 'mono', label: 'Moño' },
  { id: 'coleta', label: 'Coleta' },
  { id: 'entradas', label: 'Con entradas' },
  { id: 'calvo', label: 'Sin pelo' },
  { id: 'permanente', label: 'Permanente' },
];

export const COLORES_PELO: readonly (Pieza & { hex: string })[] = [
  { id: 'negro', label: 'Negro', hex: '#23201b' },
  { id: 'castano', label: 'Castaño', hex: '#4a3428' },
  { id: 'castano-claro', label: 'Castaño claro', hex: '#7a5636' },
  { id: 'rubio', label: 'Rubio', hex: '#c9a34e' },
  { id: 'pelirrojo', label: 'Pelirrojo', hex: '#a84b22' },
  { id: 'canoso', label: 'Canoso', hex: '#9aa0a6' },
  { id: 'blanco', label: 'Blanco', hex: '#dcdcd6' },
  { id: 'tenido', label: 'Teñido', hex: '#7d3a7a' },
];

export const ROPAS: readonly Pieza[] = [
  { id: 'camisa', label: 'Camisa' },
  { id: 'camiseta', label: 'Camiseta' },
  { id: 'jersey', label: 'Jersey' },
  { id: 'chaqueta', label: 'Chaqueta' },
  { id: 'traje', label: 'Traje' },
  { id: 'bata', label: 'Bata de casa' },
  { id: 'mono', label: 'Mono de trabajo' },
  { id: 'chandal', label: 'Chándal' },
  { id: 'blusa', label: 'Blusa' },
  { id: 'delantal', label: 'Delantal' },
];

export const COLORES_ROPA: readonly (Pieza & { hex: string })[] = [
  { id: 'verde', label: 'Verde portal', hex: '#1e4b3e' },
  { id: 'granate', label: 'Granate', hex: '#6d2233' },
  { id: 'azul', label: 'Azul', hex: '#23557e' },
  { id: 'mostaza', label: 'Mostaza', hex: '#e0a32b' },
  { id: 'rojo', label: 'Rojo buzón', hex: '#a6301e' },
  { id: 'morado', label: 'Morado', hex: '#55385f' },
  { id: 'naranja', label: 'Naranja', hex: '#e0662b' },
  { id: 'gris', label: 'Gris', hex: '#6b6b66' },
  { id: 'crema', label: 'Crema', hex: '#d9cdb6' },
];

export const ACCESORIOS: readonly Pieza[] = [
  { id: 'ninguno', label: 'Nada' },
  { id: 'gafas', label: 'Gafas' },
  { id: 'gafas-leer', label: 'Gafas de leer el acta' },
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'collar', label: 'Collar' },
  { id: 'carpeta', label: 'Carpeta de la presidencia' },
  { id: 'llaves', label: 'Manojo de llaves' },
  { id: 'movil', label: 'Móvil' },
  { id: 'fregona', label: 'Fregona' },
  { id: 'bolso', label: 'Bolso' },
  { id: 'panuelo', label: 'Pañuelo al cuello' },
  { id: 'auriculares', label: 'Auriculares' },
];

export const FONDOS: readonly (Pieza & { hex: string; hex2: string })[] = [
  { id: 'portal', label: 'Portal', hex: '#e7e0d2', hex2: '#cbbfa6' },
  { id: 'rellano', label: 'Rellano', hex: '#dfe7e4', hex2: '#a8c1b8' },
  { id: 'ascensor', label: 'Ascensor', hex: '#d3d7db', hex2: '#9aa0a6' },
  { id: 'vivienda', label: 'Vivienda', hex: '#f3e7cf', hex2: '#d9bf90' },
  { id: 'azotea', label: 'Azotea', hex: '#cfe0ec', hex2: '#93b6cd' },
  { id: 'tablon', label: 'Tablón', hex: '#c9a678', hex2: '#a07f52' },
];

export const MARCOS: readonly Pieza[] = [
  { id: 'ninguno', label: 'Sin marco' },
  { id: 'placa', label: 'Placa de puerta' },
  { id: 'buzon', label: 'Buzón' },
  { id: 'oro', label: 'Presidencia' },
];

// ── Configuración ───────────────────────────────────────────────────────────────

/**
 * Se valida con Zod y con `catchall` estricto: una configuración de avatar que llega del
 * cliente es entrada no fiable como cualquier otra, y un id inventado tiene que caer al
 * valor por defecto en lugar de romper el render.
 */
export const avatarConfigSchema = z.object({
  cuerpo: z.string().max(24).default('medio'),
  altura: z.string().max(24).default('media'),
  cara: z.string().max(24).default('ovalada'),
  piel: z.string().max(24).default('media'),
  cejas: z.string().max(24).default('rectas'),
  ojos: z.string().max(24).default('normales'),
  nariz: z.string().max(24).default('recta'),
  boca: z.string().max(24).default('neutra'),
  pelo: z.string().max(24).default('corto'),
  colorPelo: z.string().max(24).default('castano'),
  ropa: z.string().max(24).default('camisa'),
  colorRopa: z.string().max(24).default('verde'),
  accesorio: z.string().max(24).default('ninguno'),
  fondo: z.string().max(24).default('portal'),
  marco: z.string().max(24).default('ninguno'),
});

export type AvatarConfig = z.infer<typeof avatarConfigSchema>;

export function avatarPorDefecto(): AvatarConfig {
  return avatarConfigSchema.parse({});
}

/** Valida y corrige: cualquier id desconocido cae al primero del catálogo. */
export function sanearAvatar(valor: unknown): AvatarConfig {
  const base = avatarConfigSchema.safeParse(valor);
  const config = base.success ? base.data : avatarPorDefecto();

  const enCatalogo = (
    catalogo: readonly Pieza[],
    id: string,
    porDefecto: string,
  ): string => (catalogo.some((pieza) => pieza.id === id) ? id : porDefecto);

  return {
    cuerpo: enCatalogo(CUERPOS, config.cuerpo, 'medio'),
    altura: enCatalogo(ALTURAS, config.altura, 'media'),
    cara: enCatalogo(CARAS, config.cara, 'ovalada'),
    piel: enCatalogo(TONOS_PIEL, config.piel, 'media'),
    cejas: enCatalogo(CEJAS, config.cejas, 'rectas'),
    ojos: enCatalogo(OJOS, config.ojos, 'normales'),
    nariz: enCatalogo(NARICES, config.nariz, 'recta'),
    boca: enCatalogo(BOCAS, config.boca, 'neutra'),
    pelo: enCatalogo(PELOS, config.pelo, 'corto'),
    colorPelo: enCatalogo(COLORES_PELO, config.colorPelo, 'castano'),
    ropa: enCatalogo(ROPAS, config.ropa, 'camisa'),
    colorRopa: enCatalogo(COLORES_ROPA, config.colorRopa, 'verde'),
    accesorio: enCatalogo(ACCESORIOS, config.accesorio, 'ninguno'),
    fondo: enCatalogo(FONDOS, config.fondo, 'portal'),
    marco: enCatalogo(MARCOS, config.marco, 'ninguno'),
  };
}

/** Avatar al azar, determinista si se le pasa una semilla. Es lo que se propone al entrar. */
export function avatarAleatorio(semilla = Math.random()): AvatarConfig {
  let estado = Math.floor(semilla * 0xffffff) || 1;
  const siguiente = (): number => {
    estado = (estado * 1103515245 + 12345) & 0x7fffffff;
    return estado / 0x7fffffff;
  };
  const elegir = (catalogo: readonly Pieza[]): string =>
    catalogo[Math.floor(siguiente() * catalogo.length)]?.id ?? catalogo[0]?.id ?? '';

  return sanearAvatar({
    cuerpo: elegir(CUERPOS),
    altura: elegir(ALTURAS),
    cara: elegir(CARAS),
    piel: elegir(TONOS_PIEL),
    cejas: elegir(CEJAS),
    ojos: elegir(OJOS),
    nariz: elegir(NARICES),
    boca: elegir(BOCAS),
    pelo: elegir(PELOS),
    colorPelo: elegir(COLORES_PELO),
    ropa: elegir(ROPAS),
    colorRopa: elegir(COLORES_ROPA),
    accesorio: elegir(ACCESORIOS),
    fondo: elegir(FONDOS),
    marco: 'ninguno',
  });
}

/** Colores resueltos, para que el render no tenga que buscar en los catálogos. */
export function coloresDe(config: AvatarConfig): {
  piel: string;
  pielSombra: string;
  pelo: string;
  ropa: string;
  fondo: string;
  fondo2: string;
} {
  const piel = TONOS_PIEL.find((tono) => tono.id === config.piel) ?? TONOS_PIEL[1];
  const pelo = COLORES_PELO.find((color) => color.id === config.colorPelo) ?? COLORES_PELO[1];
  const ropa = COLORES_ROPA.find((color) => color.id === config.colorRopa) ?? COLORES_ROPA[0];
  const fondo = FONDOS.find((entrada) => entrada.id === config.fondo) ?? FONDOS[0];

  return {
    piel: piel?.hex ?? '#e8c9a8',
    pielSombra: piel?.sombra ?? '#d0ad8b',
    pelo: pelo?.hex ?? '#4a3428',
    ropa: ropa?.hex ?? '#1e4b3e',
    fondo: fondo?.hex ?? '#e7e0d2',
    fondo2: fondo?.hex2 ?? '#cbbfa6',
  };
}

/** Cuántas combinaciones hay. Se enseña en el creador porque da gusto saberlo. */
export const COMBINACIONES =
  CUERPOS.length *
  ALTURAS.length *
  CARAS.length *
  TONOS_PIEL.length *
  CEJAS.length *
  OJOS.length *
  NARICES.length *
  BOCAS.length *
  PELOS.length *
  COLORES_PELO.length *
  ROPAS.length *
  COLORES_ROPA.length *
  ACCESORIOS.length *
  FONDOS.length;
