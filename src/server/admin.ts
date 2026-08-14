/**
 * Puerta del panel de administración.
 *
 * Deliberadamente mínima: si `ADMIN_PASSWORD` está definida, hace falta introducirla
 * una vez y queda en una cookie httpOnly; si no está definida, el panel queda abierto
 * (que es lo cómodo en local). Fase 2/3 traerán cuentas de verdad — el hueco `User`
 * ya existe en el modelo de datos.
 */

import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'ahqv_admin';

export function adminPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD?.trim();
  return value ? value : null;
}

export function adminGateEnabled(): boolean {
  return adminPassword() !== null;
}

export async function isAdmin(): Promise<boolean> {
  const expected = adminPassword();
  if (!expected) return true;
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === expected;
}

/** Marca la sesión como administradora. Solo válido desde Server Action/Route Handler. */
export async function signInAdmin(password: string): Promise<boolean> {
  const expected = adminPassword();
  if (!expected || password !== expected) return false;
  const store = await cookies();
  store.set(ADMIN_COOKIE, expected, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });
  return true;
}
