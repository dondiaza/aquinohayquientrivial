'use client';

/**
 * INVITAR VECINOS — el botón del que depende todo lo demás.
 *
 * El recorrido que queremos es: alguien recibe un mensaje por WhatsApp, pulsa, y está
 * dentro. Todo lo que hay aquí sirve a eso.
 *
 * ## Tres caminos, en este orden
 *
 *   1. **`navigator.share()`** — abre la hoja nativa del sistema. Es la buena: sale
 *      WhatsApp, Telegram, Mensajes, Discord, correo… sin que nosotros integremos ninguno.
 *      Está en móviles y en Safari; en escritorio depende del navegador.
 *   2. **Copiar al portapapeles** — si no hay `share`, o si el usuario lo cancela.
 *   3. **Seleccionar el texto** — si hasta el portapapeles falla (contextos sin permiso),
 *      se muestra el enlace en un campo ya seleccionado para copiarlo a mano.
 *
 * Nunca se queda uno sin poder invitar. Ese es el punto.
 *
 * ## Un detalle que importa
 *
 * `navigator.share` lanza `AbortError` cuando el usuario cierra la hoja sin elegir nada. Eso
 * NO es un fallo: tratarlo como error y saltar a «enlace copiado» confunde. Se distingue.
 */

import { useState } from 'react';

type Estado = 'listo' | 'compartiendo' | 'copiado' | 'manual';

export function BotonCompartir({
  url,
  code,
  jugadores,
  modo,
  className = '',
  children,
}: {
  url: string;
  code: string;
  jugadores?: number;
  modo?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [estado, setEstado] = useState<Estado>('listo');

  /** El mensaje. Corto, con emoji de portal y el enlace al final para que se vea entero. */
  const texto = [
    '🏢 ¡Se convoca junta!',
    '',
    jugadores && jugadores > 0
      ? `Ya somos ${jugadores} en el portal${modo ? ` · ${modo}` : ''}.`
      : 'Únete a mi partida de Aquí no hay quien viva.',
    `Código: ${code}`,
  ].join('\n');

  const compartir = async (): Promise<void> => {
    setEstado('compartiendo');

    // 1. Hoja nativa.
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'Se convoca junta', text: texto, url });
        setEstado('listo');
        marcar('SHARE_COMPLETED', { code });
        return;
      } catch (error) {
        // Cancelar no es fallar: se vuelve al estado inicial sin decir nada.
        if (error instanceof Error && error.name === 'AbortError') {
          setEstado('listo');
          return;
        }
        // Cualquier otro error: se sigue al portapapeles.
      }
    }

    // 2. Portapapeles.
    try {
      await navigator.clipboard.writeText(`${texto}\n${url}`);
      setEstado('copiado');
      marcar('SHARE_COMPLETED', { code, via: 'clipboard' });
      setTimeout(() => setEstado('listo'), 2500);
      return;
    } catch {
      // 3. A mano.
      setEstado('manual');
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        className="btn btn-rojo btn-lg w-full"
        onClick={() => {
          marcar('SHARE_CLICKED', { code });
          void compartir();
        }}
        disabled={estado === 'compartiendo'}
      >
        {estado === 'copiado' ? '✓ Enlace copiado' : (children ?? '📣 Invitar vecinos')}
      </button>

      {estado === 'manual' ? (
        <div className="mt-2">
          <p className="texto-sello text-tinta-tenue">Copia este enlace:</p>
          <input
            className="campo mt-1 w-full text-sm"
            value={url}
            readOnly
            onFocus={(evento) => evento.currentTarget.select()}
            /* Autoenfoque a propósito: si hemos llegado aquí es que copiar ha fallado y lo
               único que le queda al usuario es seleccionar y copiar a mano. */
            autoFocus
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Analítica sin dependencias: se emite un evento del navegador que el proveedor que se
 * quiera puede escuchar. No se manda nada a ningún sitio desde aquí, así que no hay
 * seguimiento de nadie mientras no se conecte algo a propósito.
 */
function marcar(evento: string, datos: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('ahqv:analitica', { detail: { evento, ...datos } }));
}
