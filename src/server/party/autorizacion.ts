/**
 * AUTORIZACIÓN DE SALA.
 *
 * Tres reglas que no se negocian:
 *
 *   1. **El código corto NO autoriza.** `4K7P` sirve para encontrar la sala. Cualquier
 *      acción —responder, usar un comodín, expulsar— exige un token.
 *   2. **Hay dos clases de token y no se mezclan.** `Room.hostToken` manda en la sala;
 *      `RoomPlayer.token` solo puede actuar en nombre de su jugador. Un jugador con el
 *      token de otro no existe: el token ES la identidad.
 *   3. **Los tokens se comparan en tiempo constante.** Comparar con `===` filtra
 *      información por el tiempo de respuesta; con 130.000 códigos posibles y salas
 *      efímeras es un ataque teórico, pero cuesta cuatro líneas evitarlo.
 *
 * Los tokens se generan con `crypto.randomBytes`: 32 bytes en base64url, que es lo que hace
 * que no se puedan adivinar aunque el código de la sala sí se pueda leer en una tele.
 */

import { randomBytes, timingSafeEqual } from 'node:crypto';

import type { RolSala } from '@/domain/party/protocolo';

/** Token opaco de 32 bytes. Se guarda en el navegador y viaja en cada petición. */
export function nuevoToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Comparación en tiempo constante. Longitudes distintas se rechazan sin filtrar nada. */
export function tokenIgual(recibido: string, esperado: string): boolean {
  if (typeof recibido !== 'string' || typeof esperado !== 'string') return false;
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type Identidad = {
  rol: RolSala;
  playerId: string | null;
  /** Nombre para los logs. Nunca se usa para autorizar. */
  nickname: string | null;
};

export const IDENTIDAD_ANONIMA: Identidad = { rol: 'SPECTATOR', playerId: null, nickname: null };

/**
 * Lee el token de la petición. Se acepta en cabecera (lo que usa la app) y como último
 * recurso en el cuerpo, para que las pruebas con `curl` sean legibles. Nunca en la URL: los
 * tokens en la query string acaban en los logs de acceso de medio internet.
 */
export function tokenDePeticion(peticion: Request, cuerpo?: { token?: unknown }): string | null {
  const cabecera = peticion.headers.get('x-sala-token');
  if (cabecera && cabecera.length >= 16) return cabecera;
  const autorizacion = peticion.headers.get('authorization');
  if (autorizacion?.startsWith('Bearer ')) {
    const valor = autorizacion.slice('Bearer '.length).trim();
    if (valor.length >= 16) return valor;
  }
  if (typeof cuerpo?.token === 'string' && cuerpo.token.length >= 16) return cuerpo.token;
  return null;
}
