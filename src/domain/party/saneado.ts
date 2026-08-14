/**
 * SANEADO Y LÍMITES — lo que separa una fiesta de un tablón de pintadas.
 *
 * Aquí se decide qué nombre puede ponerse un vecino y qué puede escribir en una ronda
 * social. Dos principios:
 *
 *   1. **Nada de HTML, nunca.** El texto se guarda limpio y se pinta como texto. React ya
 *     escapa, pero el filtro está igualmente: la defensa de una capa es la que falla.
 *   2. **Moderación básica y honesta.** Hay una lista corta de insultos y de intentos de
 *     suplantación («HOST», «PRESIDENTE», «ADMIN»). No es un filtro de contenidos
 *     perfecto y no pretende serlo: el host tiene expulsar y ocultar respuesta, que es lo
 *     que de verdad funciona en un salón.
 *
 * Los límites de ritmo (§26) están aquí como datos para que sean visibles de un vistazo.
 */

/** Cuántas veces por minuto se puede reaccionar. Pasado el límite, se ignora sin ruido. */
export const REACCIONES_POR_MINUTO = 12;

/** Envíos de texto libre por minuto en rondas sociales. */
export const TEXTOS_POR_MINUTO = 6;

/** Intentos de entrar en una sala por IP y minuto: frena la enumeración de códigos. */
export const INTENTOS_UNIRSE_POR_MINUTO = 20;

/** Intenciones por jugador y minuto, tope general. */
export const INTENCIONES_POR_MINUTO = 120;

export const NICK_MIN = 2;
export const NICK_MAX = 14;
export const TEXTO_LIBRE_MAX = 160;

const DIACRITICOS = /[\u0300-\u036f]/g;

/**
 * Palabras que no se admiten como nombre. Lista corta a propósito: cubre lo que aparece de
 * verdad en una fiesta (suplantación del host y cuatro insultos) sin convertirse en un
 * censor que rechaza apellidos.
 */
const NOMBRES_RESERVADOS = [
  'host',
  'admin',
  'administrador',
  'presidente',
  'sistema',
  'moderador',
  'servidor',
  'null',
  'undefined',
];

const PALABRAS_VETADAS = [
  'puta',
  'puto',
  'gilipollas',
  'cabron',
  'maricon',
  'subnormal',
  'retrasado',
  'violar',
  'nazi',
  'hitler',
];

/**
 * Quita caracteres de control e invisibles.
 *
 * Recorre puntos de código en lugar de usar una expresión regular con caracteres de control
 * dentro: ESLint las prohíbe con razón (son ilegibles y se corrompen al copiar y pegar), y
 * así además queda escrito QUÉ se quita y por que. Se cae:
 *
 *   - controles C0 y C1: saltos de línea y compañía dentro de un nombre;
 *   - U+200B a U+200F: espacios de ancho cero y marcas de dirección, el truco clásico para
 *     colarse dos veces con "el mismo" nombre o para romper una lista;
 *   - U+2028/U+2029 y U+202A a U+202E: separadores de línea y anulación de dirección, con
 *     los que se puede pintar un nombre del revés;
 *   - U+FEFF: la marca de orden de bytes.
 */
function quitarInvisibles(valor: string): string {
  let salida = '';
  for (const caracter of valor) {
    const punto = caracter.codePointAt(0) ?? 0;
    const esControl = punto < 0x20 || (punto >= 0x7f && punto <= 0x9f);
    const esInvisible =
      (punto >= 0x200b && punto <= 0x200f) ||
      punto === 0x2028 ||
      punto === 0x2029 ||
      (punto >= 0x202a && punto <= 0x202e) ||
      punto === 0xfeff;
    if (!esControl && !esInvisible) salida += caracter;
  }
  return salida;
}

function normalizar(valor: string): string {
  return valor
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .replace(/[^a-z0-9ñ]/g, '');
}

export type ResultadoNombre =
  | { ok: true; nickname: string }
  | { ok: false; motivo: 'CORTO' | 'LARGO' | 'RESERVADO' | 'VETADO' | 'VACIO' };

/**
 * Limpia y valida un nombre de vecino.
 *
 * Se permiten letras, números, espacios y unos pocos signos (punto, guion, apóstrofo), que
 * es lo que hace falta para «M.ª José» o «Jean-Luc». Se colapsan los espacios y se recorta.
 */
export function sanearNombre(entrada: string): ResultadoNombre {
  const limpio = quitarInvisibles(entrada)
    .replace(/[<>&"'`\\{}[\]|^~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NICK_MAX);

  if (limpio.length === 0) return { ok: false, motivo: 'VACIO' };
  if (limpio.length < NICK_MIN) return { ok: false, motivo: 'CORTO' };

  const comparable = normalizar(limpio);
  if (comparable.length === 0) return { ok: false, motivo: 'VACIO' };
  if (NOMBRES_RESERVADOS.includes(comparable)) return { ok: false, motivo: 'RESERVADO' };
  if (PALABRAS_VETADAS.some((palabra) => comparable.includes(palabra))) {
    return { ok: false, motivo: 'VETADO' };
  }

  return { ok: true, nickname: limpio };
}

/**
 * Nombre alternativo cuando el elegido ya está ocupado: «Marisa» → «Marisa 2».
 * Se ofrece en lugar de un error seco, porque en una fiesta hay dos Marisas.
 */
export function nombreAlternativo(nickname: string, ocupados: readonly string[]): string {
  const usados = new Set(ocupados.map((nombre) => normalizar(nombre)));
  if (!usados.has(normalizar(nickname))) return nickname;

  for (let sufijo = 2; sufijo <= 30; sufijo += 1) {
    const base = nickname.slice(0, Math.max(NICK_MIN, NICK_MAX - String(sufijo).length - 1));
    const candidato = `${base} ${sufijo}`;
    if (!usados.has(normalizar(candidato))) return candidato;
  }
  return `${nickname.slice(0, NICK_MAX - 5)} ${Math.floor(Math.random() * 900) + 100}`;
}

export type ResultadoTexto = { ok: true; texto: string } | { ok: false; motivo: 'VACIO' | 'VETADO' };

/**
 * Texto libre de las rondas sociales. Se quita todo lo que huela a marcado, se colapsan
 * los espacios y se corta. El filtro de palabras es el mismo que el de los nombres.
 */
export function sanearTextoLibre(entrada: string): ResultadoTexto {
  const limpio = quitarInvisibles(entrada)
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TEXTO_LIBRE_MAX);

  if (limpio.length === 0) return { ok: false, motivo: 'VACIO' };

  const comparable = normalizar(limpio);
  if (PALABRAS_VETADAS.some((palabra) => comparable.includes(palabra))) {
    return { ok: false, motivo: 'VETADO' };
  }

  return { ok: true, texto: limpio };
}

// ── Límite de ritmo ─────────────────────────────────────────────────────────────

export type Cubo = { fichas: number; ultimoRelleno: number };

/**
 * Cubo de fichas. Se usa para reacciones, textos e intenciones: es una función pura del
 * estado del cubo y del reloj, así que se puede guardar en el estado de la sala y no hace
 * falta ningún temporizador.
 */
export function gastarFicha(
  cubo: Cubo | undefined,
  porMinuto: number,
  ahora: number,
): { permitido: boolean; cubo: Cubo } {
  const capacidad = Math.max(1, porMinuto);
  const actual = cubo ?? { fichas: capacidad, ultimoRelleno: ahora };

  const transcurrido = Math.max(0, ahora - actual.ultimoRelleno);
  const rellenadas = (transcurrido / 60_000) * capacidad;
  const disponibles = Math.min(capacidad, actual.fichas + rellenadas);

  if (disponibles < 1) {
    return { permitido: false, cubo: { fichas: disponibles, ultimoRelleno: ahora } };
  }

  return { permitido: true, cubo: { fichas: disponibles - 1, ultimoRelleno: ahora } };
}
