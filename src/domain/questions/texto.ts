/**
 * Comparación de respuestas ESCRITAS (familia FICHA DEL VECINO).
 *
 * El problema de pedir que se escriba la respuesta es que castiga cosas que no son
 * saber menos: una tilde, una mayúscula, «el videoclub» en vez de «videoclub», el
 * «2ºA» sin volada, o una letra bailada al teclear con prisa. Aquí se decide qué se
 * perdona y qué no:
 *
 *   · tildes, mayúsculas y signos de puntuación: se ignoran siempre;
 *   · artículos y preposiciones al principio: se ignoran;
 *   · la puntuación interna (2.º A / 2ºA / 2 A): se compara también en versión compacta;
 *   · erratas de teclado: se admite 1 letra de diferencia (2 si la respuesta es larga);
 *   · sinónimos y nombres cortos: NO se adivinan, se declaran en `accepted`.
 *
 * Lo que NO se perdona es responder otra cosa: el margen de erratas nunca llega a
 * confundir dos nombres distintos del reparto.
 */

const MARCAS_DIACRITICAS = /[̀-ͯ]/g;
const VOLADAS = /[ºª°]/g;

/** Minúsculas, sin tildes, sin puntuación y con los espacios colapsados. */
export function normalizarTexto(valor: string): string {
  return valor
    .toLowerCase()
    .normalize('NFD')
    .replace(MARCAS_DIACRITICAS, '')
    .replace(VOLADAS, '')
    .replace(/[^a-z0-9ñ%,. ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Solo letras y números: «2.º A» y «2ºA» acaban valiendo lo mismo. */
export function compactarTexto(valor: string): string {
  return normalizarTexto(valor).replace(/[^a-z0-9ñ]/g, '');
}

const ARTICULOS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'en']);

/** Quita artículos y preposiciones del principio: «el videoclub» → «videoclub». */
function sinArticulos(valor: string): string {
  const palabras = valor.split(' ');
  let inicio = 0;
  while (inicio < palabras.length - 1 && ARTICULOS.has(palabras[inicio] ?? '')) inicio += 1;
  return palabras.slice(inicio).join(' ');
}

/** Distancia de edición de Levenshtein, con corte temprano en `maximo`. */
export function distanciaEdicion(a: string, b: string, maximo: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maximo) return maximo + 1;

  let anterior = Array.from({ length: b.length + 1 }, (_, indice) => indice);

  for (let i = 1; i <= a.length; i += 1) {
    const actual: number[] = [i];
    let mejorFila = i;
    for (let j = 1; j <= b.length; j += 1) {
      const coste = a[i - 1] === b[j - 1] ? 0 : 1;
      const valor = Math.min(
        (actual[j - 1] ?? 0) + 1,
        (anterior[j] ?? 0) + 1,
        (anterior[j - 1] ?? 0) + coste,
      );
      actual.push(valor);
      if (valor < mejorFila) mejorFila = valor;
    }
    if (mejorFila > maximo) return maximo + 1;
    anterior = actual;
  }

  return anterior[b.length] ?? maximo + 1;
}

/** Margen de erratas admitido según lo larga que sea la respuesta esperada. */
function margen(esperada: string): number {
  if (esperada.length <= 4) return 0;
  if (esperada.length <= 10) return 1;
  return 2;
}

export type CoincidenciaTexto = {
  acierta: boolean;
  /** Con qué forma aceptada ha coincidido (útil para el revelado). */
  coincideCon?: string;
  /** true si ha hecho falta perdonar una errata. */
  conErrata: boolean;
};

/** ¿La respuesta escrita vale? Compara contra la canónica y las formas aceptadas. */
export function coincideRespuesta(
  escrita: string,
  canonica: string,
  aceptadas: readonly string[] = [],
): CoincidenciaTexto {
  const candidata = normalizarTexto(escrita);
  if (!candidata) return { acierta: false, conErrata: false };

  const candidataCorta = sinArticulos(candidata);
  const candidataCompacta = compactarTexto(escrita);

  for (const forma of [canonica, ...aceptadas]) {
    const esperada = normalizarTexto(forma);
    if (!esperada) continue;
    const esperadaCorta = sinArticulos(esperada);

    if (
      candidata === esperada ||
      candidataCorta === esperadaCorta ||
      (candidataCompacta.length > 1 && candidataCompacta === compactarTexto(forma))
    ) {
      return { acierta: true, coincideCon: forma, conErrata: false };
    }

    const tolerancia = margen(esperadaCorta);
    if (tolerancia > 0 && distanciaEdicion(candidataCorta, esperadaCorta, tolerancia) <= tolerancia) {
      return { acierta: true, coincideCon: forma, conErrata: true };
    }
  }

  return { acierta: false, conErrata: false };
}

/**
 * Pista de iniciales: «José Luis Gil» → «J··· L··· G··».
 * Se usa cuando el pack no trae pista propia y la pregunta es de las difíciles.
 */
export function pistaDeIniciales(respuesta: string): string {
  return respuesta
    .split(/\s+/)
    .map((palabra) => palabra.charAt(0) + '·'.repeat(Math.max(0, palabra.length - 1)))
    .join(' ');
}
