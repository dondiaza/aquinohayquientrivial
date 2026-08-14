/**
 * CÓDIGO DE SALA — lo que alguien tiene que leer en una tele desde el sofá y teclear en
 * un móvil sin equivocarse.
 *
 * El alfabeto se construye QUITANDO parejas que se confunden a tres metros, no añadiendo
 * las que gustan:
 *
 *   · `O`/`0`, `I`/`1`/`L`, `S`/`5`, `B`/`8`, `Z`/`2`, `U`/`V` — se cae la pareja entera;
 *   · `G`/`6` y `T`/`7` se confunden en tipografías de tele: se queda solo uno de cada;
 *   · fuera las vocales, para no generar palabras desafortunadas por casualidad.
 *
 * Quedan 19 símbolos y 4 posiciones: 130.321 combinaciones. Con las salas caducando a las
 * pocas horas la colisión es anecdótica, y aun así el generador reintenta contra la base
 * de datos (§2 del encargo: regenerar si colisiona).
 *
 * IMPORTANTE: el código NO autoriza nada. Sirve para ENCONTRAR la sala. Para actuar hace
 * falta el token del jugador o el del host (`src/server/party/autorizacion.ts`).
 */

/** 19 símbolos sin ambigüedad visual. */
export const ALFABETO_CODIGO = '3469CDFHJKMNPQRTWXY';

export const LONGITUD_CODIGO = 4;

export const COMBINACIONES_CODIGO = ALFABETO_CODIGO.length ** LONGITUD_CODIGO;

/** Genera un código con la fuente de azar que se le pase (inyectable = testeable). */
export function generarCodigo(aleatorio: () => number = Math.random): string {
  let codigo = '';
  for (let posicion = 0; posicion < LONGITUD_CODIGO; posicion += 1) {
    const indice = Math.min(
      Math.floor(aleatorio() * ALFABETO_CODIGO.length),
      ALFABETO_CODIGO.length - 1,
    );
    codigo += ALFABETO_CODIGO.charAt(indice);
  }
  return codigo;
}

/**
 * Correcciones de lo que la gente teclea de más. Solo se corrige hacia un símbolo QUE SÍ
 * está en el alfabeto: si alguien escribe una `A` no puede ser una `A` de verdad, y el
 * `4` es lo que más se le parece.
 */
const CORRECCIONES: Record<string, string> = {
  A: '4',
  E: '3',
  G: '6',
  '7': 'T',
  V: 'W',
};

const DIACRITICOS = /[\u0300-\u036f]/g;

/**
 * Normaliza lo que teclea una persona: minúsculas, espacios, guiones y las confusiones
 * habituales. Lo que no se puede interpretar se descarta y lo detectará el largo, para que
 * el mensaje de error sea «revisa el código» y no un fallo silencioso.
 */
export function normalizarCodigo(entrada: string): string {
  const limpio = entrada
    .toUpperCase()
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .replace(/[^A-Z0-9]/g, '');

  let resultado = '';
  for (const caracter of limpio) {
    if (ALFABETO_CODIGO.includes(caracter)) {
      resultado += caracter;
      continue;
    }
    const corregido = CORRECCIONES[caracter];
    if (corregido) resultado += corregido;
  }

  return resultado.slice(0, LONGITUD_CODIGO);
}

export function esCodigoValido(codigo: string): boolean {
  if (codigo.length !== LONGITUD_CODIGO) return false;
  return [...codigo].every((caracter) => ALFABETO_CODIGO.includes(caracter));
}
