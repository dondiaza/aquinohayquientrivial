'use client';

import { useEffect, useState } from 'react';

/**
 * ESTADO SIN CONEXIÓN — «telefonillo sin línea».
 *
 * Aviso fijo y discreto en cuanto el navegador informa de que no hay red. Lo importante
 * va primero (que no hay conexión y qué implica); el chiste, después.
 */
export function OfflineNotice() {
  const [sinConexion, setSinConexion] = useState(false);

  useEffect(() => {
    const actualizar = () => setSinConexion(!navigator.onLine);
    actualizar();
    window.addEventListener('online', actualizar);
    window.addEventListener('offline', actualizar);
    return () => {
      window.removeEventListener('online', actualizar);
      window.removeEventListener('offline', actualizar);
    };
  }, []);

  if (!sinConexion) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-40 border-b-2 border-tinta bg-rojo-buzon px-3 py-1.5 text-center text-papel"
    >
      <p className="texto-sello">
        Sin conexión · no se guardarán las respuestas hasta que vuelva la línea
      </p>
      <p className="text-[0.7rem] opacity-90">El telefonillo no da señal. Pasa como siempre.</p>
    </div>
  );
}
