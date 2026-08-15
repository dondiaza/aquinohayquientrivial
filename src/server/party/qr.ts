/**
 * QR de la sala.
 *
 * Se genera en el SERVIDOR y se devuelve como SVG en línea: sin librería en el navegador,
 * sin peticiones a un servicio de terceros (que además vería todos los códigos de sala) y
 * sin imagen que cargar. En una tele el QR tiene que estar nítido y estar YA.
 *
 * Nivel de corrección `M` y margen 1: es lo que aguanta un salón con reflejos sin hacer el
 * código gigante. Los colores son los del portal, con contraste de sobra para que un móvil
 * lo lea desde el sofá.
 */

import QRCode from 'qrcode';

/** URL absoluta a la que apunta el QR. Debe llevar al join directo, no a la portada. */
export function urlDeUnion(base: string, code: string): string {
  const limpia = base.replace(/\/+$/, '');
  return `${limpia}/unirse/${code}`;
}

export async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#23201b', light: '#f7f2e6' },
  });
}

/**
 * Base pública del sitio. Se resuelve así, en este orden:
 *
 *   1. `NEXT_PUBLIC_SITE_URL` si está definida (lo que se despliega en producción);
 *   2. la cabecera `host` de la petición, que es lo que hace que funcione en la red local
 *      sin configurar nada — y jugar en el salón con la tele y los móviles del wifi de casa
 *      es exactamente el caso principal de este juego.
 */
export function baseDeSitio(peticion: { headers: Headers }): string {
  const configurada = process.env.NEXT_PUBLIC_SITE_URL;
  if (configurada) return configurada;

  const host = peticion.headers.get('x-forwarded-host') ?? peticion.headers.get('host');
  const protocolo =
    peticion.headers.get('x-forwarded-proto') ??
    (host?.startsWith('localhost') || host?.startsWith('192.168') ? 'http' : 'https');

  return host ? `${protocolo}://${host}` : 'http://localhost:3210';
}
