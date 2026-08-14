'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  AJUSTES_AUDIO_POR_DEFECTO,
  guardarAjustes,
  leerAjustesGuardados,
  obtenerMotorDeAudio,
  type AjustesAudio,
  type SonidoId,
} from './engine';

type ContextoAudio = {
  ajustes: AjustesAudio;
  actualizar: (cambios: Partial<AjustesAudio>) => void;
  sonar: (id: SonidoId, intensidad?: number) => void;
  /** true cuando ya ha habido un gesto del usuario y el audio puede sonar. */
  listo: boolean;
};

const Contexto = createContext<ContextoAudio | null>(null);

/**
 * Provee el audio a toda la app.
 *
 * El AudioContext se crea en el PRIMER gesto del usuario (pointerdown/keydown), nunca
 * antes: así no hay autoplay bloqueado ni sonidos inesperados al abrir la página.
 */
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [ajustes, setAjustes] = useState<AjustesAudio>(AJUSTES_AUDIO_POR_DEFECTO);
  const [listo, setListo] = useState(false);
  const motor = useMemo(() => obtenerMotorDeAudio(), []);
  const cargado = useRef(false);

  // Preferencias guardadas (tras el montaje, para no romper la hidratación).
  useEffect(() => {
    const guardados = leerAjustesGuardados();
    setAjustes(guardados);
    motor.configurar(guardados);
    cargado.current = true;
  }, [motor]);

  // Desbloqueo en el primer gesto.
  useEffect(() => {
    const desbloquear = () => {
      motor.desbloquear();
      setListo(true);
      window.removeEventListener('pointerdown', desbloquear);
      window.removeEventListener('keydown', desbloquear);
    };
    window.addEventListener('pointerdown', desbloquear, { once: true });
    window.addEventListener('keydown', desbloquear, { once: true });
    return () => {
      window.removeEventListener('pointerdown', desbloquear);
      window.removeEventListener('keydown', desbloquear);
    };
  }, [motor]);

  const actualizar = useCallback(
    (cambios: Partial<AjustesAudio>) => {
      setAjustes((actuales) => {
        const siguientes = { ...actuales, ...cambios };
        motor.configurar(siguientes);
        if (cargado.current) guardarAjustes(siguientes);
        // Al subir el volumen o quitar el silencio, un pitido de confirmación.
        if (cambios.silencio === false || (cambios.volumen !== undefined && !siguientes.silencio)) {
          motor.desbloquear();
          motor.reproducir('seleccion');
        }
        return siguientes;
      });
    },
    [motor],
  );

  const sonar = useCallback(
    (id: SonidoId, intensidad = 1) => {
      motor.reproducir(id, intensidad);
    },
    [motor],
  );

  const valor = useMemo<ContextoAudio>(
    () => ({ ajustes, actualizar, sonar, listo }),
    [ajustes, actualizar, sonar, listo],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/**
 * Hook de audio. Si se usa fuera del provider (por ejemplo en un test), devuelve una
 * implementación muda: los componentes no tienen que comprobar nada.
 */
export function useAudio(): ContextoAudio {
  const contexto = useContext(Contexto);
  if (contexto) return contexto;
  return {
    ajustes: AJUSTES_AUDIO_POR_DEFECTO,
    actualizar: () => {},
    sonar: () => {},
    listo: false,
  };
}
