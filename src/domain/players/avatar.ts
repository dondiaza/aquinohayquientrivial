/**
 * AVATARES — arquetipos de vecino, sin parecido con personas reales.
 *
 * No representan actores ni personajes de ninguna obra: son tipos genéricos de
 * comunidad de vecinos (presidente, portería, estudiante, jubilación…), dibujados con
 * formas propias. El perfil guarda solo los IDS; el dibujo vive en
 * `src/components/portal/Avatar.tsx`.
 */

export const ARQUETIPOS = [
  { id: 'presidente', label: 'Presidente', linea: 'Carpeta bajo el brazo y agenda llena' },
  { id: 'porteria', label: 'Portería', linea: 'Lo ve todo desde la garita' },
  { id: 'estudiante', label: 'Estudiante', linea: 'Auriculares y horarios imposibles' },
  { id: 'jubilacion', label: 'Jubilado', linea: 'Boina, paciencia y memoria de elefante' },
  { id: 'oficina', label: 'De oficina', linea: 'Sale con prisa y vuelve con más' },
  { id: 'elegante', label: 'Vecino elegante', linea: 'Nunca coincide contigo en el ascensor' },
  { id: 'manitas', label: 'Manitas', linea: 'Tiene la herramienta que hace falta' },
  { id: 'administracion', label: 'Administración', linea: 'Firma circulares y desaparece' },
] as const;

export type ArquetipoId = (typeof ARQUETIPOS)[number]['id'];

export const ARQUETIPO_IDS = ARQUETIPOS.map((arquetipo) => arquetipo.id) as [
  ArquetipoId,
  ...ArquetipoId[],
];

export const COLORES_AVATAR = [
  { id: 'verde', label: 'Verde portal', valor: '#1e4b3e' },
  { id: 'granate', label: 'Granate', valor: '#6d2233' },
  { id: 'azul', label: 'Azul impreso', valor: '#23557e' },
  { id: 'mostaza', label: 'Mostaza', valor: '#c98f1f' },
  { id: 'morado', label: 'Morado junta', valor: '#55385f' },
  { id: 'madera', label: 'Madera', valor: '#6b4429' },
] as const;

export type ColorAvatarId = (typeof COLORES_AVATAR)[number]['id'];

export const COLOR_AVATAR_IDS = COLORES_AVATAR.map((color) => color.id) as [
  ColorAvatarId,
  ...ColorAvatarId[],
];

/** Marcos: se desbloquean con el rango, así que la progresión se ve en el perfil. */
export const MARCOS = [
  { id: 'ninguno', label: 'Sin marco', nivelMinimo: 1, rareza: 'comun' },
  { id: 'metal', label: 'Metal del telefonillo', nivelMinimo: 2, rareza: 'comun' },
  { id: 'madera', label: 'Madera del tablón', nivelMinimo: 3, rareza: 'curioso' },
  { id: 'azulejo', label: 'Azulejo del zaguán', nivelMinimo: 4, rareza: 'raro' },
  { id: 'dorado', label: 'Placa dorada', nivelMinimo: 6, rareza: 'legendario' },
] as const;

export type MarcoId = (typeof MARCOS)[number]['id'];

export const MARCO_IDS = MARCOS.map((marco) => marco.id) as [MarcoId, ...MarcoId[]];

export function getArquetipo(id: string) {
  return ARQUETIPOS.find((arquetipo) => arquetipo.id === id) ?? ARQUETIPOS[0];
}

export function getColorAvatar(id: string) {
  return COLORES_AVATAR.find((color) => color.id === id) ?? COLORES_AVATAR[0];
}

export function getMarco(id: string) {
  return MARCOS.find((marco) => marco.id === id) ?? MARCOS[0];
}

export function marcosDisponibles(nivel: number) {
  return MARCOS.filter((marco) => marco.nivelMinimo <= nivel);
}
