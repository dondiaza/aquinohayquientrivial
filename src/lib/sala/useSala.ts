'use client';

/**
 * EL HOOK DE LA SALA — lo que usan la tele y el móvil.
 *
 * Mantiene tres cosas y nada más:
 *
 *   · el SNAPSHOT (la foto de la sala, ya filtrada por el servidor para quien pregunta);
 *   · los EVENTOS que van llegando, que se aplican encima;
 *   · el DESFASE con el reloj del servidor, para pintar el tiempo sin creerse el del móvil.
 *
 * Cuando algo se pone raro —el móvil vuelve de segundo plano, la conexión se cae, llega un
 * evento cuyo `seq` no encaja— no se intenta arreglar el estado a mano: se vuelve a pedir el
 * snapshot. Es lo que hace que no haya una segunda implementación del juego en el cliente,
 * que es de donde salen las desincronizaciones en los multijugador caseros.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  EventoSala,
  IntencionCliente,
  ResultadoIntencion,
  RolSala,
  VistaSala,
} from '@/domain/party/protocolo';
import type { DistributiveOmit } from '@/domain/types';

/**
 * Intencion sin `opId`: lo pone el hook si el llamante no lo trae. Se usa `DistributiveOmit`
 * y no `Omit` porque `IntencionCliente` es una union discriminada: con `Omit` normal
 * TypeScript colapsa la union y deja de reconocer los campos propios de cada intención.
 */
export type IntencionSinOp = DistributiveOmit<IntencionCliente, 'opId'> & { opId?: string };

import { crearTransporte, nuevoOpId, type EstadoConexion, type Transporte } from './transporte';

export type SalaEnVivo = {
  sala: VistaSala | null;
  rol: RolSala;
  playerId: string | null;
  conexion: EstadoConexion;
  /** Reloj del servidor estimado. Se usa para TODO lo que sea tiempo. */
  ahora: () => number;
  /** Últimos eventos recibidos, para animaciones puntuales (reacciones, avisos…). */
  ultimos: EventoSala[];
  enviar: (intencion: IntencionSinOp) => Promise<ResultadoIntencion>;
  recargar: () => Promise<void>;
  error: string | null;
};

export function useSala(code: string, token: string | null): SalaEnVivo {
  const [sala, setSala] = useState<VistaSala | null>(null);
  const [rol, setRol] = useState<RolSala>('SPECTATOR');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [conexion, setConexion] = useState<EstadoConexion>('conectando');
  const [ultimos, setUltimos] = useState<EventoSala[]>([]);
  const [error, setError] = useState<string | null>(null);

  const transporte = useRef<Transporte | null>(null);
  const desfase = useRef(0);
  const pidiendo = useRef(false);

  const recargar = useCallback(async (): Promise<void> => {
    if (pidiendo.current) return;
    pidiendo.current = true;
    try {
      const respuesta = await fetch(`/api/salas/${code}/snapshot`, {
        headers: token ? { 'x-sala-token': token } : {},
        cache: 'no-store',
      });
      const datos = (await respuesta.json()) as
        | { ok: true; sala: VistaSala; rol: RolSala; playerId: string | null }
        | { ok: false; mensaje: string };

      if (!datos.ok) {
        setError(datos.mensaje);
        return;
      }
      setError(null);
      setSala(datos.sala);
      setRol(datos.rol);
      setPlayerId(datos.playerId);
      desfase.current = datos.sala.servidorAhora - Date.now();
    } catch {
      setError('Estamos intentando volver al portal…');
    } finally {
      pidiendo.current = false;
    }
  }, [code, token]);

  // Suscripción al stream. Cada evento importante provoca una relectura del snapshot: es
  // más tráfico que aplicar deltas a mano, y a cambio no hay dos verdades que puedan diferir.
  useEffect(() => {
    const nuevo = crearTransporte({ code, token });
    transporte.current = nuevo;
    nuevo.alCambiarEstado(setConexion);

    void recargar();

    const cancelar = nuevo.suscribir((eventos) => {
      desfase.current = nuevo.desfase();
      setUltimos(eventos);
      void recargar();
    });

    return () => {
      cancelar();
      transporte.current = null;
    };
  }, [code, token, recargar]);

  // El móvil se bloquea o cambias de app: al volver, foto nueva. Sin esto, un jugador que
  // atiende una llamada vuelve a una pantalla congelada, que es el fallo clásico.
  useEffect(() => {
    const alVolver = (): void => {
      if (document.visibilityState === 'visible') void recargar();
    };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('online', alVolver);
    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('online', alVolver);
    };
  }, [recargar]);

  const enviar = useCallback(
    async (intencion: IntencionSinOp): Promise<ResultadoIntencion> => {
      const actual = transporte.current;
      if (!actual) {
        return { ok: false, error: 'ENTRADA_INVALIDA', mensaje: 'Sin conexión con el portal' };
      }
      const completa = { ...intencion, opId: intencion.opId ?? nuevoOpId() } as IntencionCliente;
      const resultado = await actual.enviar(completa);
      // Respuesta inmediata en pantalla sin esperar al siguiente evento.
      void recargar();
      return resultado;
    },
    [recargar],
  );

  const ahora = useCallback(() => Date.now() + desfase.current, []);

  return { sala, rol, playerId, conexion, ahora, ultimos, enviar, recargar, error };
}

/**
 * Guarda la identidad de la sala en el navegador. Es lo que permite recargar el móvil y
 * seguir siendo el mismo vecino en vez de aparecer como un duplicado.
 */
export const almacen = {
  clave(code: string): string {
    return `ahqv:sala:${code.toUpperCase()}`;
  },
  leer(code: string): { token: string; playerId: string; nickname: string } | null {
    if (typeof window === 'undefined') return null;
    try {
      const bruto = window.localStorage.getItem(almacen.clave(code));
      if (!bruto) return null;
      return JSON.parse(bruto) as { token: string; playerId: string; nickname: string };
    } catch {
      return null;
    }
  },
  guardar(code: string, datos: { token: string; playerId: string; nickname: string }): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(almacen.clave(code), JSON.stringify(datos));
    } catch {
      // Modo incógnito con almacenamiento capado: se juega igual, pero recargar pedirá nombre.
    }
  },
  borrar(code: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(almacen.clave(code));
    } catch {
      // Nada que hacer.
    }
  },
  /** Token de host, aparte: nunca debe acabar en el mismo sitio que el de jugador. */
  claveHost(code: string): string {
    return `ahqv:host:${code.toUpperCase()}`;
  },
  leerHost(code: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(almacen.claveHost(code));
    } catch {
      return null;
    }
  },
  guardarHost(code: string, token: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(almacen.claveHost(code), token);
    } catch {
      // Idem.
    }
  },
};
