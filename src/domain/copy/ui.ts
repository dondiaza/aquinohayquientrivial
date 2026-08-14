/**
 * Textos de interfaz centralizados. Cambiar el tono del juego = editar este fichero.
 * (Los textos de racha, feedback, rangos y eventos viven en sus propios módulos de copy.)
 */

export const BRAND = {
  name: 'El Trivial de Desengaño 21',
  short: 'Desengaño 21',
  tagline: 'El trivial de Aquí no hay quien viva',
  legalNote:
    'Juego de aficionados sobre «Aquí no hay quien viva» (Antena 3, 2003-2006). Sin relación ' +
    'ni afiliación con Antena 3, Atresmedia ni la productora. Las preguntas son datos sobre la ' +
    'serie; toda la identidad gráfica de esta web es original y hecha con SVG y CSS: no se usa ' +
    'ningún fotograma, logotipo, tipografía ni audio de la serie.',
} as const;

export const HOME = {
  kicker: 'Desengaño 21 · Comunidad de propietarios',
  title: 'El trivial de Aquí no hay quien viva',
  subtitle:
    'Casi mil preguntas sobre la serie de Antena 3: el reparto, los pisos, las tramas y las cinco ' +
    'temporadas. Once formas de preguntar, comodines, derramas y una apuesta final. Un poquito de ' +
    'por favor y a jugar.',
  primaryCta: 'Jugar ahora',
  secondary: {
    solo: 'Jugar solo',
    party: 'Crear partida',
    partyBadge: 'Próximamente',
    how: 'Cómo jugar',
  },
  bullets: [
    {
      icon: '🏢',
      title: 'Todo el portal',
      text: 'Reparto, pisos, relaciones, tramas, producción, audiencias y adaptaciones.',
    },
    {
      icon: '🎯',
      title: 'Once formas de preguntar',
      text: 'Opciones, verdadero/falso, escribir la respuesta, pistas, intruso, ordenar y memoria.',
    },
    {
      icon: '🙈',
      title: 'Modo sin spoilers',
      text: 'Si no has llegado al final, activa el modo y no verás lo que pasa en la quinta.',
    },
    {
      icon: '📡',
      title: 'Comodines y sucesos',
      text: 'Radio Patio, un poquito de por favor, derramas y ascensores averiados.',
    },
  ],
  demoNotice:
    'Las preguntas salen de un pack editorial contrastado con Antena 3 y FormulaTV, y cada una ' +
    'lleva su explicación y su nivel de destripe. Lo que no se ha podido dejar impecable está ' +
    'marcado para revisión y no sale en las partidas.',
} as const;

export const MODES = {
  title: 'Elige cómo juegas',
  solo: {
    title: 'Solo',
    text: 'Tú contra el portal. Rachas, comodines y ronda final.',
    cta: 'Jugar solo',
  },
  party: {
    title: 'Con vecinos',
    text: 'Una pantalla de presentación y los móviles como mandos. Llega en la Fase 3.',
    cta: 'Próximamente',
  },
} as const;

export const SETUP = {
  title: 'Configura la junta',
  subtitle: 'Cuatro decisiones y a jugar. Todo se puede cambiar en la siguiente partida.',
  duration: 'Duración',
  difficulty: 'Dificultad',
  category: 'Temática',
  adaptive: 'Dificultad adaptativa',
  adaptiveHint: 'Sube o baja según cómo te vaya. Desactívala para dificultad fija.',
  spoilers: 'Modo sin spoilers',
  spoilersHint:
    'Fuera las preguntas que destripan la serie: muertes, bodas decisivas y final de la quinta.',
  name: 'Tu nombre (opcional)',
  namePlaceholder: 'Vecino/a del 3.º B',
  submit: 'Empezar la partida',
  back: 'Volver',
} as const;

export const GAME = {
  score: 'Puntos',
  round: 'Ronda',
  question: 'Pregunta',
  lockedNotice: 'Respuesta registrada',
  timeUp: 'Se acabó el tiempo',
  next: 'Siguiente',
  nextQuestion: 'Siguiente pregunta',
  startRound: 'Empezar la ronda',
  continue: 'Continuar',
  finish: 'Ver resultados',
  abandon: 'Dejar la partida',
  abandonConfirm: '¿Seguro que quieres dejar la partida? Se guardará lo jugado hasta ahora.',
  introTitle: 'Se abre la sesión',
  introLine: 'Contesta rápido, usa los comodines cuando toque y no te fíes de Radio Patio.',
  introCta: 'Empezar',
  powerUps: 'Comodines',
  betTitle: 'Apuesta final',
  betHint: 'Apuesta parte de tus puntos. Si aciertas los ganas; si fallas los pierdes.',
  betPlace: 'Apostar y ver la pregunta',
  betNone: 'Jugar sin apostar',
  betMax: 'Máximo',
  clues: 'Pistas',
  revealClue: 'Pedir otra pista',
  cluesExhausted: 'No hay más pistas',
  orderHint: 'Ordena de arriba (primero) a abajo (último). Puedes arrastrar o usar las flechas.',
  moveUp: 'Subir',
  moveDown: 'Bajar',
  confirmOrder: 'Confirmar orden',
  impostorHint: 'Señala el que NO encaja.',
  syncError: 'No se ha podido guardar el progreso en el servidor. La partida sigue.',
} as const;

export const RESULTS = {
  title: 'Acta de la partida',
  playAgain: 'Volver a jugar',
  changeSetup: 'Cambiar configuración',
  home: 'Volver al portal',
  stats: {
    score: 'Puntos totales',
    accuracy: 'Aciertos',
    correct: 'Correctas',
    wrong: 'Incorrectas',
    timeouts: 'Sin responder',
    bestStreak: 'Mejor racha',
    avgTime: 'Tiempo medio',
    avgDifficulty: 'Dificultad media',
    bonus: 'Puntos de bonus',
    powerUps: 'Comodines usados',
    wager: 'Saldo de la apuesta',
    rank: 'Rango',
  },
  byRound: 'Por rondas',
  byType: 'Por tipo de prueba',
  unfinished: 'Esta partida no se ha terminado.',
} as const;

export const HOW_TO = {
  title: 'Cómo jugar',
  subtitle: 'Dos minutos de lectura para no perder por despiste.',
} as const;

export const PORTAL_PAGE = {
  title: 'El portal',
  subtitle: 'Quién vive dónde en Desengaño 21, según la biblia editorial del pack.',
} as const;

export const PRUEBAS_PAGE = {
  title: 'Pruebas y modos',
  subtitle:
    'El catálogo del pack editorial: retos y minijuegos con sus reglas, y los modos de juego ' +
    'que los combinan. Lo que ya está jugable lleva su enlace.',
} as const;

export const TARJETAS_PAGE = {
  title: 'Tarjetas del portal',
  subtitle:
    'Microcontenidos del pack: un dato por tarjeta. Salen entre rondas mientras carga la ' +
    'siguiente pregunta y se pueden repasar aquí.',
} as const;

export const PHASE3 = {
  title: 'Todavía no, pero está en camino',
  line: 'Las salas online, los móviles como mandos y los equipos llegan en la Fase 3. La arquitectura ya está preparada: el motor de juego es el mismo y los eventos ya viajan tipados.',
  cta: 'Jugar solo mientras tanto',
} as const;
