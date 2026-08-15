/**
 * SESIÓN EN LA PETICIÓN — quién es quien está pidiendo algo.
 *
 * Una sola función (`usuarioActual`) que todo el servidor usa. Nunca se lee la cookie en
 * otro sitio: si mañana la sesión pasa a una cabecera o a un JWT, se cambia aquí y ya.
 *
 * La cookie es `httpOnly` (el JavaScript de la página no la puede leer, así que un XSS no
 * se lleva la sesión), `sameSite=lax` (un formulario de otro dominio no puede usarla, que
 * es la defensa de CSRF que necesitamos porque las mutaciones van por POST) y `secure` en
 * producción.
 */

import { cookies } from 'next/headers';

import { COOKIE_SESION, VIDA_SESION_MS, validarSesion } from './auth';
import { cuentaPorId, type CuentaConPerfil } from './service';

export type Sesion = {
  userId: string;
  sessionId: string;
  cuenta: CuentaConPerfil;
};

/** Sesión actual, o null si se está jugando como invitado. */
export async function usuarioActual(): Promise<Sesion | null> {
  const almacen = await cookies();
  const token = almacen.get(COOKIE_SESION)?.value ?? null;

  const valida = await validarSesion(token);
  if (!valida) return null;

  const cuenta = await cuentaPorId(valida.userId);
  if (!cuenta) return null;
  // Una cuenta suspendida o pendiente de borrado no puede actuar, pero tampoco se le miente:
  // el flujo de acceso le dirá qué pasa.
  if (cuenta.estado === 'BANEADA' || cuenta.estado === 'SUSPENDIDA') return null;

  return { userId: valida.userId, sessionId: valida.sessionId, cuenta };
}

/** Solo el id, para cuando no hace falta cargar la cuenta entera. */
export async function idUsuarioActual(): Promise<string | null> {
  const almacen = await cookies();
  const token = almacen.get(COOKIE_SESION)?.value ?? null;
  const valida = await validarSesion(token);
  return valida?.userId ?? null;
}

export async function ponerCookieSesion(token: string, expiresAt: Date): Promise<void> {
  const almacen = await cookies();
  almacen.set(COOKIE_SESION, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
    maxAge: Math.floor(VIDA_SESION_MS / 1000),
  });
}

export async function quitarCookieSesion(): Promise<void> {
  const almacen = await cookies();
  almacen.set(COOKIE_SESION, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
