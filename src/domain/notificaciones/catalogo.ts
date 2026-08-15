/**
 * CATÁLOGO DE NOTIFICACIONES.
 *
 * Cada tipo declara: a qué categoría pertenece (que es lo que el usuario activa o apaga),
 * por qué canales puede salir, si cuenta como «enganche» (y por tanto gasta tope) y adónde
 * lleva al pulsarla.
 *
 * Dos criterios al escribir los textos:
 *
 *   · **Siempre hay un motivo.** «Pablo te ha retado» tiene motivo. «¡Te echamos de menos!»
 *     no lo tiene, y por eso aquí no existe.
 *   · **El deep link lleva al sitio exacto** (§56). Ninguna notificación abre la portada:
 *     abre la solicitud, el desafío, la sala o el reto concreto.
 */

export const CANALES = ['IN_APP', 'PUSH', 'EMAIL'] as const;
export type CanalNotificacion = (typeof CANALES)[number];

/** Categorías que el usuario puede activar o apagar, una a una (§35). */
export const CATEGORIAS = [
  { id: 'social', label: 'Social', descripcion: 'Solicitudes, invitaciones y retos de amigos' },
  { id: 'competicion', label: 'Competición', descripcion: 'Liga, récords y clasificaciones' },
  { id: 'progreso', label: 'Progreso', descripcion: 'Logros, niveles y racha' },
  { id: 'contenido', label: 'Contenido', descripcion: 'Reto diario, semanal y eventos' },
  { id: 'sistema', label: 'Cuenta y seguridad', descripcion: 'Acceso y avisos de la cuenta' },
] as const;

export type CategoriaId = (typeof CATEGORIAS)[number]['id'];

export const TIPOS_NOTIFICACION = [
  'FRIEND_REQUESTED',
  'FRIEND_ACCEPTED',
  'ROOM_INVITE_CREATED',
  'CHALLENGE_CREATED',
  'CHALLENGE_COMPLETED',
  'REMATCH_REQUESTED',
  'SCORE_BEATEN',
  'LEAGUE_POSITION_CHANGED',
  'LEAGUE_ENDING',
  'LEAGUE_PROMOTED',
  'STREAK_AT_RISK',
  'STREAK_RECOVERABLE',
  'DAILY_AVAILABLE',
  'WEEKLY_AVAILABLE',
  'ACHIEVEMENT_UNLOCKED',
  'LEVEL_UP',
  'SEASON_STARTED',
  'SEASON_ENDING',
  'RECAP_READY',
  'FRIENDS_PLAYING',
  'ACCOUNT_SECURITY',
] as const;

export type TipoNotificacion = (typeof TIPOS_NOTIFICACION)[number];

export type ReglaNotificacion = {
  categoria: CategoriaId;
  canales: readonly CanalNotificacion[];
  /**
   * true = es una notificación de ENGANCHE (invita a volver). Gasta tope de frecuencia y se
   * apaga sola si el jugador lleva días sin aparecer.
   *
   * false = es una notificación de HECHO: alguien te ha retado, has subido de liga. Estas no
   * gastan tope de enganche, porque responden a algo que ha hecho otra persona o a algo que
   * el jugador ha conseguido. Confundir las dos cosas es lo que quema el canal.
   */
  esEnganche: boolean;
  /** Puede sonar en horario silencioso (solo invitaciones en vivo, y si se activa). */
  ignoraSilencio?: boolean;
  /** Adónde lleva. `:id` se sustituye al construir la notificación. */
  deepLink: string;
  prioridad: number;
};

export const REGLAS: Record<TipoNotificacion, ReglaNotificacion> = {
  FRIEND_REQUESTED: {
    categoria: 'social',
    canales: ['IN_APP', 'PUSH'],
    esEnganche: false,
    deepLink: '/amigos/solicitudes',
    prioridad: 2,
  },
  FRIEND_ACCEPTED: {
    categoria: 'social',
    canales: ['IN_APP', 'PUSH'],
    esEnganche: false,
    deepLink: '/perfil/:id',
    prioridad: 1,
  },
  ROOM_INVITE_CREATED: {
    categoria: 'social',
    canales: ['IN_APP', 'PUSH'],
    esEnganche: false,
    // Una invitación a una partida que está pasando AHORA es lo único que puede sonar de
    // noche, y solo si el jugador ha dejado activa la categoría social.
    ignoraSilencio: true,
    deepLink: '/unirse/:code',
    prioridad: 3,
  },
  CHALLENGE_CREATED: {
    categoria: 'social',
    canales: ['IN_APP', 'PUSH'],
    esEnganche: false,
    deepLink: '/desafio/:id',
    prioridad: 2,
  },
  CHALLENGE_COMPLETED: {
    categoria: 'social',
    canales: ['IN_APP', 'PUSH'],
    esEnganche: false,
    deepLink: '/desafio/:id',
    prioridad: 2,
  },
  REMATCH_REQUESTED: {
    categoria: 'social',
    canales: ['IN_APP', 'PUSH'],
    esEnganche: false,
    deepLink: '/desafio/:id',
    prioridad: 2,
  },
  SCORE_BEATEN: {
    categoria: 'competicion',
    canales: ['IN_APP', 'PUSH'],
    esEnganche: false,
    deepLink: '/reto',
    prioridad: 2,
  },
  LEAGUE_POSITION_CHANGED: {
    // A propósito SIN push: los cambios de puesto pasan todo el rato y avisar de cada uno
    // es la forma más rápida de que alguien apague las notificaciones para siempre.
    categoria: 'competicion',
    canales: ['IN_APP'],
    esEnganche: false,
    deepLink: '/liga',
    prioridad: 0,
  },
  LEAGUE_ENDING: {
    categoria: 'competicion',
    canales: ['IN_APP', 'PUSH'],
    esEnganche: true,
    deepLink: '/liga',
    prioridad: 2,
  },
  LEAGUE_PROMOTED: {
    categoria: 'competicion',
    canales: ['IN_APP', 'PUSH'],
    esEnganche: false,
    deepLink: '/liga',
    prioridad: 3,
  },
  STREAK_AT_RISK: {
    categoria: 'progreso',
    canales: ['IN_APP', 'PUSH'],
    esEnganche: true,
    deepLink: '/reto',
    prioridad: 2,
  },
  STREAK_RECOVERABLE: {
    categoria: 'progreso',
    canales: ['IN_APP', 'PUSH'],
    esEnganche: true,
    deepLink: '/reto',
    prioridad: 1,
  },
  DAILY_AVAILABLE: {
    categoria: 'contenido',
    canales: ['IN_APP', 'PUSH'],
    esEnganche: true,
    deepLink: '/reto',
    prioridad: 1,
  },
  WEEKLY_AVAILABLE: {
    categoria: 'contenido',
    canales: ['IN_APP', 'PUSH'],
    esEnganche: true,
    deepLink: '/retos',
    prioridad: 1,
  },
  ACHIEVEMENT_UNLOCKED: {
    categoria: 'progreso',
    canales: ['IN_APP'],
    esEnganche: false,
    deepLink: '/perfil/logros',
    prioridad: 1,
  },
  LEVEL_UP: {
    categoria: 'progreso',
    canales: ['IN_APP'],
    esEnganche: false,
    deepLink: '/perfil',
    prioridad: 1,
  },
  SEASON_STARTED: {
    categoria: 'contenido',
    canales: ['IN_APP', 'PUSH'],
    esEnganche: true,
    deepLink: '/temporada',
    prioridad: 1,
  },
  SEASON_ENDING: {
    categoria: 'contenido',
    canales: ['IN_APP', 'PUSH'],
    esEnganche: true,
    deepLink: '/temporada',
    prioridad: 2,
  },
  RECAP_READY: {
    categoria: 'contenido',
    canales: ['IN_APP', 'PUSH', 'EMAIL'],
    esEnganche: true,
    deepLink: '/resumen',
    prioridad: 1,
  },
  FRIENDS_PLAYING: {
    categoria: 'social',
    canales: ['IN_APP', 'PUSH'],
    esEnganche: true,
    deepLink: '/amigos',
    prioridad: 1,
  },
  ACCOUNT_SECURITY: {
    // Seguridad: no se puede apagar y va también por correo. Es lo único así.
    categoria: 'sistema',
    canales: ['IN_APP', 'EMAIL'],
    esEnganche: false,
    deepLink: '/ajustes/dispositivos',
    prioridad: 3,
  },
};

export const CATEGORIA_DE_TIPO: Record<TipoNotificacion, CategoriaId> = Object.fromEntries(
  TIPOS_NOTIFICACION.map((tipo) => [tipo, REGLAS[tipo].categoria]),
) as Record<TipoNotificacion, CategoriaId>;

/** Categorías que el usuario NO puede apagar. Solo seguridad. */
export const CATEGORIAS_OBLIGATORIAS: readonly CategoriaId[] = ['sistema'];

export type TextoNotificacion = { titulo: string; cuerpo: string; deepLink: string };

/**
 * Textos. Cortos, con el motivo delante y sin signos de exclamación de más: la notificación
 * tiene que parecer un aviso del portal, no una promoción.
 */
export function redactar(
  tipo: TipoNotificacion,
  datos: Record<string, string | number>,
): TextoNotificacion {
  const quien = String(datos.quien ?? 'Alguien');
  const deepLink = REGLAS[tipo].deepLink.replace(/:(\w+)/g, (_, clave: string) =>
    String(datos[clave] ?? ''),
  );

  const textos: Record<TipoNotificacion, { titulo: string; cuerpo: string }> = {
    FRIEND_REQUESTED: { titulo: `${quien} quiere ser vecino tuyo`, cuerpo: 'Acepta o dale largas.' },
    FRIEND_ACCEPTED: { titulo: `${quien} te ha aceptado`, cuerpo: 'Ya podéis retaros.' },
    ROOM_INVITE_CREATED: {
      titulo: `${quien} te invita a una junta`,
      cuerpo: 'La partida está empezando.',
    },
    CHALLENGE_CREATED: {
      titulo: `${quien} te reta`,
      cuerpo: `${datos.puntos ?? 0} puntos. Misma partida, mismas preguntas.`,
    },
    CHALLENGE_COMPLETED: {
      titulo: `${quien} ha jugado tu desafío`,
      cuerpo: `Ha hecho ${datos.puntos ?? 0} puntos.`,
    },
    REMATCH_REQUESTED: { titulo: `${quien} quiere revancha`, cuerpo: 'Cuando te venga bien.' },
    SCORE_BEATEN: {
      titulo: `${quien} ha superado tu récord`,
      cuerpo: `Por ${datos.diferencia ?? 0} puntos en el reto de hoy.`,
    },
    LEAGUE_POSITION_CHANGED: {
      titulo: `Vas ${datos.posicion ?? 0}.º en tu liga`,
      cuerpo: `${datos.detalle ?? ''}`,
    },
    LEAGUE_ENDING: {
      titulo: 'Tu liga termina mañana',
      cuerpo: `Vas ${datos.posicion ?? 0}.º${datos.paraAscender ? ` · te faltan ${datos.paraAscender} para ascender` : ''}.`,
    },
    LEAGUE_PROMOTED: {
      titulo: `Has ascendido a ${datos.liga ?? 'la siguiente liga'}`,
      cuerpo: 'La próxima temporada empieza con gente nueva.',
    },
    STREAK_AT_RISK: {
      titulo: `Tu racha de ${datos.dias ?? 0} días sigue viva`,
      cuerpo: 'Completa el reto de hoy para mantenerla.',
    },
    STREAK_RECOVERABLE: {
      titulo: 'Puedes recuperar tu racha',
      cuerpo: `Te quedan ${datos.dias ?? 0} días para completar la misión.`,
    },
    DAILY_AVAILABLE: {
      titulo: 'El reto de hoy ya está disponible',
      cuerpo: `${datos.titular ?? 'Mismas preguntas para todo el portal.'}`,
    },
    WEEKLY_AVAILABLE: {
      titulo: 'Nuevos retos de la semana',
      cuerpo: `${datos.cuantos ?? 3} misiones nuevas en el tablón.`,
    },
    ACHIEVEMENT_UNLOCKED: {
      titulo: `Logro: ${datos.logro ?? ''}`,
      cuerpo: String(datos.detalle ?? ''),
    },
    LEVEL_UP: {
      titulo: `Nivel ${datos.nivel ?? 0} · ${datos.rango ?? ''}`,
      cuerpo: String(datos.detalle ?? ''),
    },
    SEASON_STARTED: {
      titulo: `Empieza ${datos.temporada ?? 'la temporada'}`,
      cuerpo: 'Retos nuevos y liga desde cero.',
    },
    SEASON_ENDING: {
      titulo: `${datos.temporada ?? 'La temporada'} termina pronto`,
      cuerpo: `Te quedan ${datos.dias ?? 0} días.`,
    },
    RECAP_READY: {
      titulo: 'Tu resumen semanal ya está listo',
      cuerpo: `${datos.partidas ?? 0} partidas y ${datos.records ?? 0} récords nuevos.`,
    },
    FRIENDS_PLAYING: {
      titulo: `${datos.cuantos ?? 0} vecinos están jugando ahora`,
      cuerpo: 'Hay junta abierta.',
    },
    ACCOUNT_SECURITY: {
      titulo: 'Acceso a tu cuenta',
      cuerpo: String(datos.detalle ?? 'Se ha iniciado sesión en un dispositivo nuevo.'),
    },
  };

  return { ...textos[tipo], deepLink };
}
