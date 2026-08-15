/**
 * TRANSPORTE DE SALA (cliente).
 *
 * Esta es la frontera de la que habla `docs/FASE3-REALTIME.md`: el juego habla con esta
 * interfaz, no con SSE. Cambiar mañana a un WebSocket en Coolify o a un proveedor gestionado
 * es escribir otro driver aquí; ni el protocolo ni la UI se enteran.
 *
 * El driver que se despliega hace dos cosas:
 *
 *   1. **SSE mientras funcione.** `EventSource` reconecta solo y manda `Last-Event-ID`, así
 *      que el servidor sabe por dónde iba sin que nadie programe nada.
 *   2. **Sondeo cuando no.** Si SSE falla dos veces seguidas (proxy corporativo, red de bar,
 *      navegador raro), se baja a sondeo con el mismo cursor y el juego sigue. El usuario no
 *      ve la diferencia salvo por un punto de estado.
 *
 * El cursor (`seq`) es lo único que hay que conservar. Recargar la página, perder el wifi o
 * que Vercel corte la función son el mismo caso: se vuelve a pedir «lo que haya después de N».
 */

import type { EventoSala, IntencionCliente, ResultadoIntencion } from '@/domain/party/protocolo';

export type EstadoConexion = 'conectando' | 'en-vivo' | 'sondeando' | 'sin-conexion';

export type Transporte = {
  /** Empieza a recibir. Devuelve la función para dejar de recibir. */
  suscribir(alRecibir: (eventos: EventoSala[]) => void): () => void;
  /** Manda una intención. El servidor decide; esto solo transporta. */
  enviar(intencion: IntencionCliente): Promise<ResultadoIntencion>;
  /** Estado de la conexión, para el puntito de la esquina. */
  alCambiarEstado(escucha: (estado: EstadoConexion) => void): void;
  /** Desfase con el reloj del servidor, en ms (servidor − cliente). */
  desfase(): number;
  cursor(): number;
};

export type OpcionesTransporte = {
  code: string;
  token: string | null;
  /** Cursor de partida. 0 = desde el principio. */
  desde?: number;
  /** Intervalo del sondeo de emergencia. */
  intervaloSondeoMs?: number;
};

const INTERVALO_SONDEO_MS = 900;
/** Tras estos fallos seguidos de SSE se baja a sondeo y ya no se vuelve a intentar. */
const FALLOS_PARA_SONDEO = 2;

export function crearTransporte(opciones: OpcionesTransporte): Transporte {
  const { code } = opciones;
  let cursor = opciones.desde ?? 0;
  let desfaseMs = 0;
  let estado: EstadoConexion = 'conectando';
  let escuchaEstado: ((estado: EstadoConexion) => void) | null = null;
  let fallosSse = 0;
  let vivo = true;

  const cambiarEstado = (nuevo: EstadoConexion): void => {
    if (estado === nuevo) return;
    estado = nuevo;
    escuchaEstado?.(nuevo);
  };

  const cabeceras = (): HeadersInit => ({
    'content-type': 'application/json',
    ...(opciones.token ? { 'x-sala-token': opciones.token } : {}),
  });

  const suscribir = (alRecibir: (eventos: EventoSala[]) => void): (() => void) => {
    let fuente: EventSource | null = null;
    let temporizador: ReturnType<typeof setTimeout> | null = null;

    const procesar = (eventos: EventoSala[]): void => {
      if (eventos.length === 0) return;
      for (const evento of eventos) if (evento.seq > cursor) cursor = evento.seq;
      alRecibir(eventos);
    };

    // ── Sondeo ──
    const sondear = async (): Promise<void> => {
      if (!vivo) return;
      try {
        const respuesta = await fetch(
          `/api/salas/${code}/eventos?modo=sondeo&desde=${cursor}`,
          { headers: cabeceras(), cache: 'no-store' },
        );
        if (!respuesta.ok) throw new Error(String(respuesta.status));
        const datos = (await respuesta.json()) as {
          eventos: EventoSala[];
          servidorAhora: number;
        };
        desfaseMs = datos.servidorAhora - Date.now();
        cambiarEstado('sondeando');
        procesar(datos.eventos);
      } catch {
        cambiarEstado('sin-conexion');
      }
      if (vivo) {
        temporizador = setTimeout(
          () => void sondear(),
          opciones.intervaloSondeoMs ?? INTERVALO_SONDEO_MS,
        );
      }
    };

    // ── SSE ──
    const abrirSse = (): void => {
      if (!vivo) return;
      // El token no puede ir en la URL (acabaría en los logs de acceso), y `EventSource` no
      // admite cabeceras. Se resuelve identificando por cookie de sesión de sala: el
      // servidor acepta el token por cabecera en las demás llamadas y aquí cae a la
      // audiencia pública, que es justo lo que la TV necesita. Los móviles, que sí necesitan
      // eventos privados, usan sondeo autenticado.
      const url = `/api/salas/${code}/eventos?modo=sse&desde=${cursor}`;
      fuente = new EventSource(url);

      fuente.onopen = (): void => {
        fallosSse = 0;
        cambiarEstado('en-vivo');
      };

      fuente.addEventListener('reloj', (evento) => {
        try {
          const datos = JSON.parse((evento as MessageEvent<string>).data) as {
            servidorAhora: number;
          };
          desfaseMs = datos.servidorAhora - Date.now();
        } catch {
          // Un mensaje de reloj mal formado no es motivo para tirar la conexión.
        }
      });

      fuente.onmessage = (evento: MessageEvent<string>): void => {
        try {
          procesar([JSON.parse(evento.data) as EventoSala]);
        } catch {
          // Idem: se ignora el mensaje suelto y se sigue.
        }
      };

      fuente.onerror = (): void => {
        fuente?.close();
        fuente = null;
        fallosSse += 1;
        if (!vivo) return;
        if (fallosSse >= FALLOS_PARA_SONDEO) {
          cambiarEstado('sondeando');
          void sondear();
          return;
        }
        cambiarEstado('conectando');
        temporizador = setTimeout(abrirSse, 1200);
      };
    };

    // Los clientes con token (móviles) necesitan sus eventos privados, y `EventSource` no
    // sabe mandar cabeceras: van directos a sondeo autenticado. La TV, que solo necesita
    // los eventos públicos, se lleva el SSE.
    if (opciones.token) void sondear();
    else abrirSse();

    return () => {
      vivo = false;
      fuente?.close();
      if (temporizador) clearTimeout(temporizador);
    };
  };

  const enviar = async (intencion: IntencionCliente): Promise<ResultadoIntencion> => {
    try {
      const respuesta = await fetch(`/api/salas/${code}/intencion`, {
        method: 'POST',
        headers: cabeceras(),
        body: JSON.stringify({ intencion }),
      });
      const datos = (await respuesta.json()) as ResultadoIntencion;
      return datos;
    } catch {
      return {
        ok: false,
        error: 'ENTRADA_INVALIDA',
        mensaje: 'Estamos intentando volver al portal…',
      };
    }
  };

  return {
    suscribir,
    enviar,
    alCambiarEstado: (escucha) => {
      escuchaEstado = escucha;
      escucha(estado);
    },
    desfase: () => desfaseMs,
    cursor: () => cursor,
  };
}

/** Id de operación para la idempotencia. Uno por pulsación, se repite en los reintentos. */
export function nuevoOpId(): string {
  const azar =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return azar.replace(/-/g, '').slice(0, 32);
}
