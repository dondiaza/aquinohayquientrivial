/**
 * IDENTIDAD PÚBLICA — nombre de usuario y código de amigo.
 *
 * Dos reglas que no se negocian:
 *
 *   1. **Nunca se identifica a nadie por el nombre.** Internamente todo va por `id`. El
 *      nombre es una etiqueta que se puede cambiar; si algo depende de él, cambiarlo rompe
 *      cosas y además permite suplantar a quien lo suelte.
 *   2. **El código de amigo no revela nada.** `PACO-82K7` no deja adivinar el id interno ni
 *      contar cuántos usuarios hay, que es lo que pasa cuando se usa un contador.
 *
 * El enfriamiento al cambiar de nombre existe porque un nombre que cambia cada hora no
 * sirve para reconocer a nadie, y porque es el truco clásico para hacerse pasar por otro
 * justo después de que alguien te bloquee.
 */

/** Días que hay que esperar entre cambios de nombre. */
export const ENFRIAMIENTO_USERNAME_DIAS = 30;

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 16;

const DIACRITICOS = /[̀-ͯ]/g;

/**
 * Nombres que no se pueden coger. Corta a propósito: cubre la suplantación (que es el daño
 * real) y cuatro insultos, sin convertirse en un censor que rechace apellidos.
 */
const RESERVADOS = [
  'admin',
  'administrador',
  'moderador',
  'sistema',
  'soporte',
  'ayuda',
  'oficial',
  'staff',
  'host',
  'presidente',
  'anhqv',
  'desengano21',
  'null',
  'undefined',
  'anonimo',
  'yo',
];

const VETADAS = ['puta', 'puto', 'gilipollas', 'cabron', 'maricon', 'subnormal', 'nazi', 'hitler'];

export type ResultadoUsername =
  | { ok: true; username: string; normalizado: string }
  | { ok: false; motivo: 'CORTO' | 'LARGO' | 'CARACTERES' | 'RESERVADO' | 'VETADO' };

/**
 * Forma canónica para comparar. Sin tildes, sin mayúsculas y sin los caracteres que se
 * confunden: así `Marta`, `marta` y `mart4` no pueden coexistir para suplantarse.
 */
export function normalizarUsername(valor: string): string {
  return valor
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/0/g, 'o')
    .replace(/1/g, 'l')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/_/g, '');
}

export function validarUsername(entrada: string): ResultadoUsername {
  const limpio = entrada.trim();

  if (limpio.length < USERNAME_MIN) return { ok: false, motivo: 'CORTO' };
  if (limpio.length > USERNAME_MAX) return { ok: false, motivo: 'LARGO' };
  // Letras, números, guion bajo y punto. Nada de espacios ni de signos que engañen.
  if (!/^[A-Za-z0-9_.]+$/.test(limpio)) return { ok: false, motivo: 'CARACTERES' };

  const normalizado = normalizarUsername(limpio);
  if (normalizado.length < USERNAME_MIN) return { ok: false, motivo: 'CORTO' };
  if (RESERVADOS.includes(normalizado)) return { ok: false, motivo: 'RESERVADO' };
  if (VETADAS.some((palabra) => normalizado.includes(palabra))) return { ok: false, motivo: 'VETADO' };

  return { ok: true, username: limpio, normalizado };
}

export const MENSAJE_USERNAME: Record<
  Exclude<ResultadoUsername, { ok: true }>['motivo'],
  string
> = {
  CORTO: `Muy corto: mínimo ${USERNAME_MIN} caracteres.`,
  LARGO: `Muy largo: máximo ${USERNAME_MAX} caracteres.`,
  CARACTERES: 'Solo letras, números, punto y guion bajo.',
  RESERVADO: 'Ese nombre está reservado. Elige otro.',
  VETADO: 'Ese nombre no cuela. Pon algo que puedas decir en voz alta.',
};

/** ¿Puede cambiarse ya el nombre? */
export function puedeCambiarUsername(
  ultimoCambio: Date | null,
  ahora: Date,
): { puede: boolean; diasRestantes: number } {
  if (!ultimoCambio) return { puede: true, diasRestantes: 0 };
  const dias = (ahora.getTime() - ultimoCambio.getTime()) / 86_400_000;
  const restantes = Math.ceil(ENFRIAMIENTO_USERNAME_DIAS - dias);
  return { puede: restantes <= 0, diasRestantes: Math.max(0, restantes) };
}

// ── Código de amigo ─────────────────────────────────────────────────────────────

/** Mismo alfabeto sin ambigüedad que los códigos de sala: se dictan en voz alta. */
const ALFABETO_AMIGO = '3469CDFHJKMNPQRTWXY';

/**
 * `PACO-82K7`: una parte legible sacada del nombre y cuatro caracteres al azar. La parte
 * aleatoria es la que manda; el prefijo solo está para que se reconozca de quién es.
 */
export function generarFriendCode(username: string, aleatorio: () => number = Math.random): string {
  const prefijo =
    normalizarUsername(username).toUpperCase().slice(0, 4).padEnd(4, 'X') || 'VECI';

  let sufijo = '';
  for (let posicion = 0; posicion < 4; posicion += 1) {
    const indice = Math.min(
      Math.floor(aleatorio() * ALFABETO_AMIGO.length),
      ALFABETO_AMIGO.length - 1,
    );
    sufijo += ALFABETO_AMIGO.charAt(indice);
  }

  return `${prefijo}-${sufijo}`;
}

export function normalizarFriendCode(entrada: string): string {
  const limpio = entrada.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (limpio.length < 5) return '';
  return `${limpio.slice(0, limpio.length - 4)}-${limpio.slice(-4)}`;
}

export function esFriendCodeValido(codigo: string): boolean {
  return /^[A-Z0-9]{2,8}-[A-Z0-9]{4}$/.test(codigo);
}

// ── Visibilidad ─────────────────────────────────────────────────────────────────

export type Visibilidad = 'TODOS' | 'AMIGOS' | 'NADIE';

/**
 * ¿Puede `quien` ver algo con esta visibilidad? Se resuelve en el servidor, siempre.
 * `esAmigo` y `esUnoMismo` los calcula quien llama, porque dependen de la base de datos.
 */
export function puedeVer(
  visibilidad: Visibilidad,
  contexto: { esUnoMismo: boolean; esAmigo: boolean; estaBloqueado: boolean },
): boolean {
  // Un bloqueo gana a cualquier otra cosa, incluso a «TODOS».
  if (contexto.estaBloqueado) return false;
  if (contexto.esUnoMismo) return true;
  switch (visibilidad) {
    case 'TODOS':
      return true;
    case 'AMIGOS':
      return contexto.esAmigo;
    case 'NADIE':
      return false;
  }
}
