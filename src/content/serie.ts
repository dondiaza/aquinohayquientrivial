/**
 * AQUÍ NO HAY QUIEN VIVA — biblia de contenido.
 *
 * Fuente: el pack editorial del proyecto (`docs/pack/`), en particular
 * `04_Biblia_personajes_relaciones_lugares_ANHQV.md`, contrastado con Antena 3 y
 * FormulaTV para producción, audiencias y adaptaciones.
 *
 * Este fichero es la ÚNICA fuente de verdad de nombres, intérpretes, zonas, relaciones
 * y hitos por temporada. El importador del banco de preguntas
 * (`src/content/anhqv/importar.ts`) genera distractores a partir de estas tablas, así
 * que un dato mal escrito aquí contamina cientos de preguntas: si tocas algo, contrasta.
 *
 * Nota de derechos: aquí solo hay DATOS (nombres, papeles, fechas) y texto propio. No
 * hay fotogramas, logotipos, tipografías ni audios de la serie. Toda la identidad
 * gráfica de la web es original (SVG/CSS); los huecos para material con licencia se
 * documentan en `public/serie/LEEME.md`.
 */

export const SERIE = {
  titulo: 'Aquí no hay quien viva',
  siglas: 'ANHQV',
  cadena: 'Antena 3',
  estreno: '7 de septiembre de 2003',
  final: '6 de julio de 2006',
  temporadas: 5,
  productora: 'Miramón Mendi',
  productorEjecutivo: 'José Luis Moreno',
  creadores: ['Alberto Caballero', 'Iñaki Ariztimuño', 'Laura Caballero'],
  direccion: 'Laura Caballero',
  sintonia: 'Vocal Factory',
  direccionFicticia: 'Desengaño 21',
  ciudad: 'Madrid',
  episodioMasVisto: 'Érase un famoso',
  serieSucesora: 'La que se avecina',
} as const;

/** Zonas del edificio. El orden es el del portal, de abajo arriba. */
export const ZONAS = [
  {
    id: 'porteria',
    etiqueta: 'Portería',
    habitantes: 'Emilio y Mariano',
    idea: 'El trabajo del portero y la convivencia padre-hijo',
    icono: '🔑',
    color: 'mostaza',
  },
  {
    id: 'videoclub',
    etiqueta: 'Videoclub',
    habitantes: 'Paco y los vecinos que pasan por allí',
    idea: 'Local contiguo, punto de encuentro y de cotilleo',
    icono: '📼',
    color: 'azul',
  },
  {
    id: '1a',
    etiqueta: '1.º A',
    habitantes: 'Marisa, Vicenta y Concha',
    idea: 'Radio Patio, Valentín y todos los cotilleos del portal',
    icono: '📡',
    color: 'granate',
  },
  {
    id: '1b',
    etiqueta: '1.º B',
    habitantes: 'Mauri y Fernando',
    idea: 'Pareja, convivencia, Ezequiel y tramas sentimentales',
    icono: '💐',
    color: 'morado',
  },
  {
    id: '2a',
    etiqueta: '2.º A',
    habitantes: 'La familia Cuesta',
    idea: 'Presidencia, familia, Juan, Paloma, Natalia y Josemi',
    icono: '🏛️',
    color: 'verde',
  },
  {
    id: '2b',
    etiqueta: '2.º B',
    habitantes: 'Los Guerra e Isabel; más tarde los Heredia',
    idea: 'Isabel, Andrés, Pablo y Álex; después nuevos inquilinos',
    icono: '🌿',
    color: 'naranja',
  },
  {
    id: '3a',
    etiqueta: '3.º A',
    habitantes: 'Lucía y sus parejas en cada etapa',
    idea: 'Lucía, Roberto, Carlos, Yago y, al final, Rafael',
    icono: '🛋️',
    color: 'azul',
  },
  {
    id: '3b',
    etiqueta: '3.º B',
    habitantes: 'Belén y sus compañeras de piso',
    idea: 'Belén, Alicia, Ana, Bea, Carmen y María Jesús según la etapa',
    icono: '🍸',
    color: 'rojo',
  },
  {
    id: 'atico',
    etiqueta: 'Ático',
    habitantes: 'Cambia según la temporada',
    idea: 'Alojamiento temporal y tramas secundarias',
    icono: '🪴',
    color: 'mostaza',
  },
] as const;

export type ZonaId = (typeof ZONAS)[number]['id'];

/**
 * Personajes principales y recurrentes.
 *
 *   · `zona` es la etiqueta tal y como aparece en el banco de preguntas ('2.º A'…),
 *     porque es la cadena con la que se comparan las respuestas del pack.
 *   · `relaciones` son los nombres CORTOS de los vínculos clave (los usa el generador
 *     de distractores de EL INFILTRADO).
 *   · `paleta` es el color del retrato SVG original de `src/components/serie/Retrato.tsx`.
 */
export const PERSONAJES = [
  {
    nombre: 'Juan Cuesta',
    corto: 'Juan',
    interprete: 'José Luis Gil',
    zona: '2.º A',
    rol: 'Presidente de la comunidad; profesor',
    relaciones: ['Paloma', 'Natalia', 'José Miguel', 'Nieves'],
    rasgos: ['metódico', 'inseguro', 'obsesionado con la presidencia'],
    paleta: 'verde',
  },
  {
    nombre: 'Paloma Hurtado',
    corto: 'Paloma',
    interprete: 'Loles León',
    zona: '2.º A',
    rol: 'Esposa de Juan; impulsora de PUF',
    relaciones: ['Juan', 'Natalia', 'José Miguel'],
    rasgos: ['dominante', 'ambiciosa', 'explosiva'],
    paleta: 'rojo',
  },
  {
    nombre: 'Natalia Cuesta',
    corto: 'Natalia',
    interprete: 'Sofía Nieto',
    zona: '2.º A',
    rol: 'Hija de Juan y Paloma',
    relaciones: ['Juan', 'Paloma', 'José Miguel', 'Yamiley'],
    rasgos: ['joven', 'cambiante', 'independiente'],
    paleta: 'morado',
  },
  {
    nombre: 'José Miguel Cuesta',
    corto: 'José Miguel',
    interprete: 'Eduardo García',
    zona: '2.º A',
    rol: 'Hijo de Juan y Paloma',
    relaciones: ['Juan', 'Paloma', 'Natalia'],
    rasgos: ['irónico', 'precoz', 'miembro del Consejo de Sabios'],
    paleta: 'azul',
  },
  {
    nombre: 'Emilio Delgado',
    corto: 'Emilio',
    interprete: 'Fernando Tejero',
    zona: 'Portería',
    rol: 'Portero del edificio',
    relaciones: ['Mariano', 'Belén'],
    rasgos: ['directo', 'caótico', 'entrañable'],
    paleta: 'mostaza',
  },
  {
    nombre: 'Mariano Delgado',
    corto: 'Mariano',
    interprete: 'Eduardo Gómez',
    zona: 'Portería',
    rol: 'Padre de Emilio',
    relaciones: ['Emilio'],
    rasgos: ['buscavidas', 'filósofo de bar', 'oportunista'],
    paleta: 'granate',
  },
  {
    nombre: 'Belén López Vázquez',
    corto: 'Belén',
    interprete: 'Malena Alterio',
    zona: '3.º B',
    rol: 'Vecina con mil trabajos',
    relaciones: ['Alicia', 'Emilio', 'María Jesús'],
    rasgos: ['sarcástica', 'perseverante', 'desastre sentimental'],
    paleta: 'rojo',
  },
  {
    nombre: 'Alicia Sanz',
    corto: 'Alicia',
    interprete: 'Laura Pamplona',
    zona: '3.º B',
    rol: 'Compañera de piso de Belén',
    relaciones: ['Belén'],
    rasgos: ['segura', 'seductora', 'aspiracional'],
    paleta: 'morado',
  },
  {
    nombre: 'Lucía Álvarez',
    corto: 'Lucía',
    interprete: 'María Adánez',
    zona: '3.º A',
    rol: 'Vecina acomodada',
    relaciones: ['Rafael', 'Roberto', 'Carlos', 'Yago'],
    rasgos: ['práctica', 'elegante', 'conciliadora'],
    paleta: 'azul',
  },
  {
    nombre: 'Roberto Alonso',
    corto: 'Roberto',
    interprete: 'Daniel Guzmán',
    zona: '3.º A',
    rol: 'Arquitecto',
    relaciones: ['Lucía'],
    rasgos: ['creativo', 'inmaduro', 'romántico'],
    paleta: 'verde',
  },
  {
    nombre: 'Mauri Hidalgo',
    corto: 'Mauri',
    interprete: 'Luis Merlo',
    zona: '1.º B',
    rol: 'Periodista',
    relaciones: ['Fernando', 'Ezequiel', 'Bea'],
    rasgos: ['neurótico', 'ingenioso', 'afectivo'],
    paleta: 'morado',
  },
  {
    nombre: 'Fernando Navarro',
    corto: 'Fernando',
    interprete: 'Adrià Collado',
    zona: '1.º B',
    rol: 'Abogado',
    relaciones: ['Mauri'],
    rasgos: ['sereno', 'racional', 'reservado'],
    paleta: 'azul',
  },
  {
    nombre: 'Marisa Benito',
    corto: 'Marisa',
    interprete: 'Mariví Bilbao',
    zona: '1.º A',
    rol: 'Radio Patio',
    relaciones: ['Vicenta', 'Concha'],
    rasgos: ['ácida', 'fumadora', 'deslenguada'],
    paleta: 'granate',
  },
  {
    nombre: 'Vicenta Benito',
    corto: 'Vicenta',
    interprete: 'Gemma Cuervo',
    zona: '1.º A',
    rol: 'Radio Patio',
    relaciones: ['Marisa', 'Valentín'],
    rasgos: ['ingenua', 'romántica', 'bondadosa'],
    paleta: 'rojo',
  },
  {
    nombre: 'Concha',
    corto: 'Concha',
    interprete: 'Emma Penella',
    zona: '1.º A',
    rol: 'Radio Patio',
    relaciones: ['Marisa', 'Vicenta'],
    rasgos: ['autoritaria', 'mordaz', 'tradicional'],
    paleta: 'mostaza',
  },
  {
    nombre: 'Isabel Ruiz',
    corto: 'Isabel',
    interprete: 'Isabel Ordaz',
    zona: '2.º B',
    rol: 'La Hierbas',
    relaciones: ['Andrés', 'Pablo', 'Álex'],
    rasgos: ['alternativa', 'sentimental', 'despistada'],
    paleta: 'verde',
  },
  {
    nombre: 'Andrés Guerra',
    corto: 'Andrés',
    interprete: 'Santiago Ramos',
    zona: '2.º B',
    rol: 'Empresario',
    relaciones: ['Isabel', 'Pablo', 'Álex'],
    rasgos: ['pragmático', 'mujeriego', 'orgulloso'],
    paleta: 'granate',
  },
  {
    nombre: 'Pablo Guerra',
    corto: 'Pablo',
    interprete: 'Elio González',
    zona: '2.º B',
    rol: 'Hijo de Andrés e Isabel',
    relaciones: ['Andrés', 'Isabel', 'Álex'],
    rasgos: ['joven', 'sentimental'],
    paleta: 'azul',
  },
  {
    nombre: 'Álex Guerra',
    corto: 'Álex',
    interprete: 'Juan Díaz',
    zona: '2.º B',
    rol: 'Hijo de Andrés e Isabel',
    relaciones: ['Andrés', 'Isabel', 'Pablo'],
    rasgos: ['joven', 'impulsivo'],
    paleta: 'naranja',
  },
  {
    nombre: 'Bea Villarejo',
    corto: 'Bea',
    interprete: 'Eva Isanta',
    zona: '3.º B',
    rol: 'Madre de Ezequiel',
    relaciones: ['Mauri', 'Ana'],
    rasgos: ['responsable', 'cálida'],
    paleta: 'verde',
  },
  {
    nombre: 'Paco',
    corto: 'Paco',
    interprete: 'Guillermo Ortega',
    zona: 'Videoclub',
    rol: 'Empleado del videoclub',
    relaciones: ['Emilio', 'Lourdes'],
    rasgos: ['cinéfilo', 'ingenuo', 'leal'],
    paleta: 'mostaza',
  },
  {
    nombre: 'Yago',
    corto: 'Yago',
    interprete: 'Roberto San Martín',
    zona: '2.º B',
    rol: 'Ecologista cubano',
    relaciones: ['Lucía', 'Natalia'],
    rasgos: ['idealista', 'ecologista'],
    paleta: 'verde',
  },
  {
    nombre: 'María Jesús Vázquez',
    corto: 'María Jesús',
    interprete: 'Beatriz Carvajal',
    zona: '3.º B',
    rol: 'Madre de Belén',
    relaciones: ['Belén'],
    rasgos: ['intensa', 'práctica', 'competitiva'],
    paleta: 'rojo',
  },
  {
    nombre: 'Rafael Álvarez',
    corto: 'Rafael',
    interprete: 'Nicolás Dueñas',
    zona: '3.º A',
    rol: 'Padre de Lucía; empresario',
    relaciones: ['Lucía'],
    rasgos: ['controlador', 'pragmático'],
    paleta: 'tinta',
  },
  {
    nombre: 'Ana',
    corto: 'Ana',
    interprete: 'Vanesa Romero',
    zona: '3.º B',
    rol: 'Compañera de piso; modelo',
    relaciones: ['Bea'],
    rasgos: ['vital', 'directa'],
    paleta: 'morado',
  },
  {
    nombre: 'Nieves Cuesta',
    corto: 'Nieves',
    interprete: 'Carmen Balagué',
    zona: '2.º B',
    rol: 'Hermana de Juan',
    relaciones: ['Juan'],
    rasgos: ['competitiva', 'dominante'],
    paleta: 'naranja',
  },
] as const;

export type Personaje = (typeof PERSONAJES)[number];

/** Vínculos que dan juego. Se usan en EL INFILTRADO y en las preguntas de relaciones. */
export const RELACIONES = [
  { a: 'Juan Cuesta', b: 'Paloma Hurtado', vinculo: 'Matrimonio; padres de Natalia y Josemi' },
  { a: 'Juan Cuesta', b: 'Nieves Cuesta', vinculo: 'Hermanos' },
  { a: 'Emilio Delgado', b: 'Mariano Delgado', vinculo: 'Hijo y padre' },
  { a: 'Emilio Delgado', b: 'Belén López Vázquez', vinculo: 'Relación sentimental central e intermitente' },
  { a: 'Mauri Hidalgo', b: 'Fernando Navarro', vinculo: 'Pareja; finalmente se casan' },
  { a: 'Mauri Hidalgo', b: 'Bea Villarejo', vinculo: 'Coparentalidad de Ezequiel' },
  { a: 'Bea Villarejo', b: 'Ana', vinculo: 'Pareja' },
  { a: 'Marisa Benito', b: 'Vicenta Benito', vinculo: 'Hermanas' },
  { a: 'Marisa Benito', b: 'Concha', vinculo: 'Amistad y Radio Patio' },
  { a: 'Vicenta Benito', b: 'Concha', vinculo: 'Amistad y Radio Patio' },
  { a: 'Isabel Ruiz', b: 'Andrés Guerra', vinculo: 'Pareja / matrimonio en crisis' },
  { a: 'Andrés Guerra', b: 'Pablo Guerra', vinculo: 'Padre e hijo' },
  { a: 'Andrés Guerra', b: 'Álex Guerra', vinculo: 'Padre e hijo' },
  { a: 'Isabel Ruiz', b: 'Pablo Guerra', vinculo: 'Madre e hijo' },
  { a: 'Isabel Ruiz', b: 'Álex Guerra', vinculo: 'Madre e hijo' },
  { a: 'Lucía Álvarez', b: 'Rafael Álvarez', vinculo: 'Hija y padre' },
  { a: 'Lucía Álvarez', b: 'Roberto Alonso', vinculo: 'Pareja principal inicial' },
  { a: 'Lucía Álvarez', b: 'Yago', vinculo: 'Relación sentimental' },
  { a: 'Belén López Vázquez', b: 'Alicia Sanz', vinculo: 'Amistad y convivencia' },
  { a: 'Belén López Vázquez', b: 'María Jesús Vázquez', vinculo: 'Hija y madre' },
] as const;

/** Grandes hitos por temporada. Base de ORDENA EL DESASTRE y de las preguntas de cronología. */
export const TEMPORADAS = [
  {
    numero: 1,
    titulo: 'Se abre el portal',
    resumen:
      'Presentación del edificio y del reparto base. Lucía y Roberto llegan a Desengaño 21, se establece la presidencia de Juan, la portería de Emilio y el ecosistema de Radio Patio.',
    hitos: [
      'llegada de Lucía y Roberto a Desengaño 21',
      'Juan asume la presidencia de la comunidad',
      'Emilio se hace cargo de la portería',
    ],
    spoiler: 'none',
  },
  {
    numero: 2,
    titulo: 'Entran los Guerra',
    resumen:
      'Entran con fuerza la familia Guerra e Isabel, Bea gana presencia, Mariano se consolida en la portería y las relaciones del edificio se vuelven más enrevesadas.',
    hitos: [
      'entrada con fuerza de la familia Guerra e Isabel',
      'Mariano se consolida en la portería',
      'Bea gana presencia en el edificio',
    ],
    spoiler: 'light',
  },
  {
    numero: 3,
    titulo: 'El portal más coral',
    resumen:
      'Grandes cambios sentimentales y de convivencia. Nieves tiene mucho peso, aparecen nuevas parejas y compañeras de piso, y el reparto alcanza su etapa más coral.',
    hitos: [
      'relaciones vecinales más enrevesadas',
      'Nieves gana peso en el edificio',
      'nuevas parejas y compañeras de piso',
    ],
    spoiler: 'light',
  },
  {
    numero: 4,
    titulo: 'Bodas y rupturas',
    resumen:
      'Lucía se relaciona con Yago, Belén conoce a Pedro, Ana y Bea forman pareja, Andrés vive la trama de la amnesia y se multiplican las bodas y las rupturas.',
    hitos: [
      'Lucía se relaciona con Yago',
      'Ana y Bea forman pareja',
      'Andrés vive la trama de la amnesia',
    ],
    spoiler: 'light',
  },
  {
    numero: 5,
    titulo: 'Las termitas',
    resumen:
      'Llegan los Heredia, Mauri y Fernando se casan, nace Yamiley, muere Paloma y las termitas fuerzan el desalojo definitivo que separa a los vecinos.',
    hitos: [
      'llegada de los Heredia',
      'boda de Mauri y Fernando',
      'las termitas fuerzan el desalojo del edificio',
    ],
    spoiler: 'major',
  },
] as const;

// ── Índices de consulta ──────────────────────────────────────────────────────────

export const NOMBRES_PERSONAJES: readonly string[] = PERSONAJES.map((p) => p.nombre);
export const NOMBRES_INTERPRETES: readonly string[] = PERSONAJES.map((p) => p.interprete);
export const ETIQUETAS_ZONA: readonly string[] = ZONAS.map((z) => z.etiqueta);

const POR_NOMBRE = new Map<string, Personaje>();
for (const personaje of PERSONAJES) {
  POR_NOMBRE.set(personaje.nombre.toLowerCase(), personaje);
  POR_NOMBRE.set(personaje.corto.toLowerCase(), personaje);
}

export function buscarPersonaje(nombre: string): Personaje | undefined {
  return POR_NOMBRE.get(nombre.trim().toLowerCase());
}

export function zonaPorEtiqueta(etiqueta: string): (typeof ZONAS)[number] | undefined {
  return ZONAS.find((zona) => zona.etiqueta.toLowerCase() === etiqueta.trim().toLowerCase());
}

/** Vecinos asociados a una zona, en el orden de la biblia. */
export function personajesDeZona(etiqueta: string): readonly Personaje[] {
  return PERSONAJES.filter((personaje) => personaje.zona === etiqueta);
}

/** Nombres largos de los vínculos clave de un personaje (los `relaciones` son cortos). */
export function relacionesDe(nombre: string): string[] {
  const personaje = buscarPersonaje(nombre);
  if (!personaje) return [];
  return personaje.relaciones
    .map((corto) => buscarPersonaje(corto)?.nombre ?? corto)
    .filter((valor, indice, todos) => todos.indexOf(valor) === indice);
}
