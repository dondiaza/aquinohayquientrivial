/**
 * AUTENTICACIÓN — enlace mágico, sin contraseñas.
 *
 * No hay contraseña porque no aporta nada aquí: obliga a la gente a inventarse una,
 * a guardarla mal y a nosotros a custodiar hashes. Con un código de un solo uso enviado al
 * correo se consigue lo mismo con menos superficie.
 *
 * ## Defensas, y contra qué
 *
 *   · **Enumeración de cuentas** (§4): pedir acceso responde SIEMPRE lo mismo, exista el
 *     correo o no. Si el mensaje cambiara, cualquiera podría comprobar quién está
 *     registrado escribiendo direcciones.
 *   · **Reutilización del código**: se marca `usedAt` y se comprueba dentro de la misma
 *     transacción, así que dos pestañas no pueden canjear el mismo.
 *   · **Fuerza bruta**: el código es de 8 caracteres del alfabeto sin ambigüedad y se
 *     guarda HASHEADO; cada token cuenta sus intentos y se invalida a los cinco.
 *   · **Robo de sesión**: la cookie es `httpOnly`, `sameSite=lax` y `secure` en producción,
 *     y lo que se guarda en la base de datos es el hash del token, no el token.
 *
 * ## El correo
 *
 * `enviarCodigo` habla con un TRANSPORTE, no con un proveedor. Hoy hay dos: consola (para
 * desarrollo) y uno genérico por HTTP que se activa con variables de entorno. Cuando el
 * equipo tenga proveedor, se rellena `EMAIL_ENDPOINT` y funciona sin tocar código. Mientras
 * tanto, en desarrollo el código sale por consola, que es lo honesto: no se finge que hay
 * un correo saliendo cuando no lo hay.
 */

import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

import { prisma } from '../db';

/** Alfabeto del código: sin O/0, I/1/L, S/5… Se dicta por teléfono sin errores. */
const ALFABETO = '3469CDFHJKMNPQRTWXY';
const LONGITUD_CODIGO = 8;

/** Un código vive poco: si tarda más de esto, que pida otro. */
export const VIDA_CODIGO_MS = 15 * 60 * 1000;

/** Sesión larga: es un juego, no la banca. Se renueva sola al usarse. */
export const VIDA_SESION_MS = 90 * 24 * 60 * 60 * 1000;

/** Intentos fallidos por código antes de invalidarlo. */
export const MAX_INTENTOS = 5;

/** Peticiones de código por correo y hora. Freno al abuso del envío. */
export const MAX_ENVIOS_HORA = 5;

export const COOKIE_SESION = 'ahqv_sesion';

function hash(valor: string): string {
  return createHash('sha256').update(valor).digest('hex');
}

function hashesIguales(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function generarCodigo(): string {
  let codigo = '';
  for (let posicion = 0; posicion < LONGITUD_CODIGO; posicion += 1) {
    codigo += ALFABETO.charAt(randomInt(0, ALFABETO.length));
  }
  return `${codigo.slice(0, 4)}-${codigo.slice(4)}`;
}

export function normalizarCodigoAcceso(entrada: string): string {
  const limpio = entrada.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (limpio.length !== LONGITUD_CODIGO) return '';
  return `${limpio.slice(0, 4)}-${limpio.slice(4)}`;
}

/** Correo normalizado. No se hace nada raro con los puntos: eso rompe direcciones reales. */
export function normalizarEmail(entrada: string): string {
  return entrada.trim().toLowerCase();
}

export function esEmailPlausible(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

// ── Transporte de correo ────────────────────────────────────────────────────────

export type Correo = { para: string; asunto: string; texto: string };

export type TransporteCorreo = {
  nombre: string;
  enviar: (correo: Correo) => Promise<{ ok: boolean; detalle?: string }>;
};

/**
 * Transporte de desarrollo: escribe el código en la consola del servidor. No finge que se
 * ha mandado nada. Es lo que permite probar el flujo entero sin proveedor.
 */
export const transporteConsola: TransporteCorreo = {
  nombre: 'consola',
  enviar: async (correo) => {
    console.info('');
    console.info('  ─── CORREO (modo desarrollo, no se ha enviado nada) ───');
    console.info(`  Para:    ${correo.para}`);
    console.info(`  Asunto:  ${correo.asunto}`);
    console.info(`  ${correo.texto.split('\n').join('\n  ')}`);
    console.info('  ──────────────────────────────────────────────────────');
    console.info('');
    return { ok: true, detalle: 'consola' };
  },
};

/**
 * Transporte genérico por HTTP. Sirve para cualquier proveedor que acepte un POST con JSON
 * (Resend, Postmark, Brevo, un webhook propio…). Se configura con:
 *
 *   EMAIL_ENDPOINT   URL a la que hacer POST
 *   EMAIL_TOKEN      valor del Authorization: Bearer
 *   EMAIL_FROM       remitente
 *
 * Si no están definidas, no se usa. No hay proveedor por defecto a propósito: elegir uno
 * por el usuario sería comprometerle con un contrato que no ha firmado.
 */
export const transporteHttp: TransporteCorreo = {
  nombre: 'http',
  enviar: async (correo) => {
    const endpoint = process.env.EMAIL_ENDPOINT;
    const token = process.env.EMAIL_TOKEN;
    const from = process.env.EMAIL_FROM;
    if (!endpoint || !token || !from) return { ok: false, detalle: 'sin configurar' };

    try {
      const respuesta = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({
          from,
          to: correo.para,
          subject: correo.asunto,
          text: correo.texto,
        }),
      });
      if (!respuesta.ok) return { ok: false, detalle: `HTTP ${respuesta.status}` };
      return { ok: true };
    } catch (error) {
      return { ok: false, detalle: error instanceof Error ? error.message : 'error de red' };
    }
  },
};

export function transporteActivo(): TransporteCorreo {
  return process.env.EMAIL_ENDPOINT ? transporteHttp : transporteConsola;
}

// ── Pedir acceso ────────────────────────────────────────────────────────────────

export type ResultadoPeticion = {
  /** SIEMPRE true de cara al usuario: no se filtra si el correo existe. */
  ok: true;
  /** Solo en desarrollo con transporte de consola: permite probar sin leer el log. */
  codigoDesarrollo?: string;
};

/**
 * Pide un código de acceso. Responde lo mismo exista la cuenta o no.
 */
export async function pedirCodigo(emailBruto: string): Promise<ResultadoPeticion> {
  const email = normalizarEmail(emailBruto);
  if (!esEmailPlausible(email)) return { ok: true };

  // Freno al abuso: si ya se han pedido muchos en la última hora, no se manda otro. El
  // usuario ve la misma respuesta, así que tampoco se filtra nada por aquí.
  const desde = new Date(Date.now() - 60 * 60 * 1000);
  const recientes = await prisma.loginToken.count({ where: { email, createdAt: { gte: desde } } });
  if (recientes >= MAX_ENVIOS_HORA) return { ok: true };

  const codigo = generarCodigo();
  await prisma.loginToken.create({
    data: {
      email,
      tokenHash: hash(codigo),
      expiresAt: new Date(Date.now() + VIDA_CODIGO_MS),
    },
  });

  const transporte = transporteActivo();
  const resultado = await transporte.enviar({
    para: email,
    asunto: 'Tu código para entrar en Desengaño 21',
    texto: [
      'Tu código de acceso es:',
      '',
      `    ${codigo}`,
      '',
      'Caduca en 15 minutos y solo sirve una vez.',
      'Si no has pedido entrar, puedes ignorar este mensaje: nadie ha entrado en tu cuenta.',
    ].join('\n'),
  });

  if (!resultado.ok) {
    console.error('[auth] no se ha podido enviar el código', { detalle: resultado.detalle });
  }

  // En desarrollo con consola se devuelve el código para poder automatizar pruebas.
  const enDesarrollo = process.env.NODE_ENV !== 'production' && transporte.nombre === 'consola';
  return enDesarrollo ? { ok: true, codigoDesarrollo: codigo } : { ok: true };
}

// ── Canjear ─────────────────────────────────────────────────────────────────────

export type ResultadoCanje =
  | { ok: true; email: string }
  | { ok: false; motivo: 'INVALIDO' | 'CADUCADO' | 'USADO' | 'DEMASIADOS_INTENTOS' };

/**
 * Canjea un código. Todo dentro de una transacción: dos pestañas no pueden usar el mismo.
 */
export async function canjearCodigo(
  emailBruto: string,
  codigoBruto: string,
): Promise<ResultadoCanje> {
  const email = normalizarEmail(emailBruto);
  const codigo = normalizarCodigoAcceso(codigoBruto);
  if (!codigo) return { ok: false, motivo: 'INVALIDO' };

  const candidato = hash(codigo);

  return prisma.$transaction(async (tx) => {
    const token = await tx.loginToken.findFirst({
      where: { email, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!token) return { ok: false, motivo: 'INVALIDO' as const };
    if (token.intentos >= MAX_INTENTOS) return { ok: false, motivo: 'DEMASIADOS_INTENTOS' as const };
    if (token.expiresAt.getTime() < Date.now()) return { ok: false, motivo: 'CADUCADO' as const };

    if (!hashesIguales(candidato, token.tokenHash)) {
      await tx.loginToken.update({
        where: { id: token.id },
        data: { intentos: { increment: 1 } },
      });
      return { ok: false, motivo: 'INVALIDO' as const };
    }

    await tx.loginToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
    return { ok: true as const, email };
  });
}

// ── Sesiones ────────────────────────────────────────────────────────────────────

export type SesionCreada = { token: string; expiresAt: Date; sessionId: string };

export async function crearSesion(
  userId: string,
  contexto: { dispositivo?: string; userAgent?: string; ip?: string },
): Promise<SesionCreada> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + VIDA_SESION_MS);

  const sesion = await prisma.userSession.create({
    data: {
      userId,
      tokenHash: hash(token),
      expiresAt,
      ...(contexto.dispositivo ? { dispositivo: contexto.dispositivo } : {}),
      ...(contexto.userAgent ? { userAgent: contexto.userAgent.slice(0, 200) } : {}),
      // Solo el prefijo: sirve para detectar una sesión rara sin guardar la IP entera.
      ...(contexto.ip ? { ipPrefijo: prefijoDeIp(contexto.ip) } : {}),
    },
  });

  return { token, expiresAt, sessionId: sesion.id };
}

/** `83.45.12.9` → `83.45.x.x`. Suficiente para «esta sesión es de otro sitio». */
export function prefijoDeIp(ip: string): string {
  if (ip.includes(':')) {
    const partes = ip.split(':');
    return `${partes.slice(0, 2).join(':')}::`;
  }
  const partes = ip.split('.');
  return partes.length === 4 ? `${partes[0]}.${partes[1]}.x.x` : 'desconocido';
}

export type SesionValida = { userId: string; sessionId: string };

/** Valida una sesión y refresca su última señal de vida. */
export async function validarSesion(token: string | null): Promise<SesionValida | null> {
  if (!token || token.length < 20) return null;

  const sesion = await prisma.userSession.findUnique({
    where: { tokenHash: hash(token) },
    select: { id: true, userId: true, expiresAt: true, revokedAt: true },
  });

  if (!sesion || sesion.revokedAt) return null;
  if (sesion.expiresAt.getTime() < Date.now()) return null;

  // Se refresca de forma perezosa: no hace falta escribir en cada petición.
  void prisma.userSession
    .update({ where: { id: sesion.id }, data: { lastSeenAt: new Date() } })
    .catch(() => undefined);

  return { userId: sesion.userId, sessionId: sesion.id };
}

export async function cerrarSesion(sessionId: string): Promise<void> {
  await prisma.userSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}

/** Cierra todas las demás sesiones. Es lo que se ofrece cuando algo huele mal. */
export async function cerrarOtrasSesiones(userId: string, salvo: string): Promise<number> {
  const resultado = await prisma.userSession.updateMany({
    where: { userId, id: { not: salvo }, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return resultado.count;
}

/** Limpieza: tokens caducados y sesiones muertas. La llama el job de mantenimiento. */
export async function limpiarCaducados(): Promise<{ tokens: number; sesiones: number }> {
  const ahora = new Date();
  const [tokens, sesiones] = await Promise.all([
    prisma.loginToken.deleteMany({ where: { expiresAt: { lt: ahora } } }),
    prisma.userSession.deleteMany({
      where: { OR: [{ expiresAt: { lt: ahora } }, { revokedAt: { not: null } }] },
    }),
  ]);
  return { tokens: tokens.count, sesiones: sesiones.count };
}
