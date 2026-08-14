/**
 * Textos de interfaz centralizados. Cambiar el tono del juego = editar este fichero.
 * (Los textos de racha, feedback, rangos y eventos viven en sus propios módulos de copy.)
 */

export const BRAND = {
  name: 'El Trivial de la Comunidad',
  short: 'El Trivial',
  tagline: 'Junta de vecinos, preguntas y muy poca paciencia',
  legalNote:
    'Juego original inspirado en el género de comedias de comunidad de vecinos. Sin relación ni afiliación con ninguna serie. Todo el contenido y los gráficos son propios.',
} as const;

export const HOME = {
  kicker: 'Travesía del Portalón, 13 · Comunidad de propietarios',
  title: 'El trivial de la comunidad',
  subtitle:
    'Preguntas rápidas, comodines, derramas inesperadas y una apuesta final. Se juega en un minuto de aprendizaje y se pierde por confiarse.',
  primaryCta: 'Jugar ahora',
  secondary: {
    solo: 'Jugar solo',
    party: 'Crear partida',
    partyBadge: 'Próximamente',
    how: 'Cómo jugar',
  },
  bullets: [
    { icon: '⏱️', title: 'Partidas de 5 a 25 minutos', text: 'Express para el ascensor, maratón para la junta de julio.' },
    { icon: '🎯', title: 'Seis tipos de prueba', text: 'Múltiple, verdadero/falso, ¿quién es?, infiltrado, ordenar y apuesta final.' },
    { icon: '📡', title: 'Comodines y eventos', text: 'Radio Patio, un poquito de por favor, derramas y ascensores averiados.' },
    { icon: '🏆', title: 'Rangos y estadísticas', text: 'De visitante a leyenda de Radio Patio, con tus números al final.' },
  ],
  demoNotice:
    'El banco de preguntas de esta versión es CONTENIDO DEMO: describe una comunidad de vecinos ficticia creada para el juego. Nada aquí se presenta como dato real de ninguna serie.',
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
  subtitle: 'Tres decisiones y a jugar. Todo se puede cambiar en la siguiente partida.',
  duration: 'Duración',
  difficulty: 'Dificultad',
  category: 'Temática',
  adaptive: 'Dificultad adaptativa',
  adaptiveHint: 'Sube o baja según cómo te vaya. Desactívala para dificultad fija.',
  name: 'Tu nombre (opcional)',
  namePlaceholder: 'Vecino/a del 3ºB',
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

export const PHASE3 = {
  title: 'Todavía no, pero está en camino',
  line: 'Las salas online, los móviles como mandos y los equipos llegan en la Fase 3. La arquitectura ya está preparada: el motor de juego es el mismo y los eventos ya viajan tipados.',
  cta: 'Jugar solo mientras tanto',
} as const;
