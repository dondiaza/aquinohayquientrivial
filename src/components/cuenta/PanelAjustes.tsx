'use client';

/**
 * AJUSTES.
 *
 * Cuatro secciones y ninguna trampa:
 *
 *   · **Privacidad**: cada cosa con sus tres niveles. Nada de un interruptor «privado» que
 *     no se sabe qué hace.
 *   · **Avisos**: granular por categoría y canal (§35). El buzón no se puede apagar porque
 *     no molesta: está ahí cuando entras.
 *   · **Horario silencioso**: con horas de verdad, no un «no molestar» opaco.
 *   · **Dispositivos**: qué sesiones hay abiertas y un botón para cerrar las demás.
 *
 * Y abajo del todo, borrar la cuenta. Sin esconderlo: hacer difícil irse es una forma de
 * falta de respeto.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Visibilidad = 'TODOS' | 'AMIGOS' | 'NADIE';

type Categoria = { id: string; label: string; descripcion: string; obligatoria: boolean };
type Preferencia = { categoria: string; canal: string; activa: boolean };
type Sesion = { id: string; dispositivo: string; desde: string; ultimaVez: string };

const OPCIONES: { valor: Visibilidad; etiqueta: string }[] = [
  { valor: 'TODOS', etiqueta: 'Todos' },
  { valor: 'AMIGOS', etiqueta: 'Vecinos' },
  { valor: 'NADIE', etiqueta: 'Nadie' },
];

const ETIQUETAS_PRIVACIDAD: Record<string, string> = {
  perfilVisible: 'Quién ve tu ficha',
  estadisticasVisibles: 'Quién ve tus números',
  presenciaVisible: 'Quién ve si estás conectado',
  quienPuedeInvitar: 'Quién puede invitarte a una partida',
  quienPuedeRetar: 'Quién puede retarte',
  quienPuedeSolicitar: 'Quién puede mandarte solicitud',
};

function minutosAHora(minutos: number): string {
  const horas = String(Math.floor(minutos / 60)).padStart(2, '0');
  const resto = String(minutos % 60).padStart(2, '0');
  return `${horas}:${resto}`;
}

function horaAMinutos(hora: string): number {
  const [horas, minutos] = hora.split(':');
  return Number.parseInt(horas ?? '0', 10) * 60 + Number.parseInt(minutos ?? '0', 10);
}

export function PanelAjustes({
  username,
  friendCode,
  email,
  categorias,
  privacidadInicial,
  silencioInicial,
  preferenciasIniciales,
  sesiones,
}: {
  username: string;
  friendCode: string;
  email: string;
  categorias: Categoria[];
  privacidadInicial: Record<string, Visibilidad>;
  silencioInicial: { activo: boolean; desde: number; hasta: number };
  preferenciasIniciales: Preferencia[];
  sesiones: Sesion[];
}) {
  const router = useRouter();
  const [privacidad, setPrivacidad] = useState(privacidadInicial);
  const [silencio, setSilencio] = useState(silencioInicial);
  const [preferencias, setPreferencias] = useState(preferenciasIniciales);
  const [guardado, setGuardado] = useState(false);
  const [confirmacion, setConfirmacion] = useState('');
  const [avisoBorrado, setAvisoBorrado] = useState<string | null>(null);

  const activa = (categoria: string, canal: string): boolean => {
    const encontrada = preferencias.find(
      (preferencia) => preferencia.categoria === categoria && preferencia.canal === canal,
    );
    return encontrada?.activa ?? true;
  };

  const cambiar = (categoria: string, canal: string, valor: boolean): void => {
    setPreferencias((previas) => {
      const resto = previas.filter(
        (preferencia) => !(preferencia.categoria === categoria && preferencia.canal === canal),
      );
      return [...resto, { categoria, canal, activa: valor }];
    });
  };

  const guardar = async (): Promise<void> => {
    await fetch('/api/ajustes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ privacidad, silencio, notificaciones: preferencias }),
    });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  };

  const borrar = async (): Promise<void> => {
    const respuesta = await fetch('/api/cuenta/borrar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confirmacion }),
    });
    const datos = (await respuesta.json()) as { ok: boolean; mensaje?: string };
    setAvisoBorrado(datos.mensaje ?? null);
    if (datos.ok) setTimeout(() => router.push('/'), 2500);
  };

  return (
    <div className="mt-6 space-y-8">
      {/* ── Cuenta ─────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg">Tu cuenta</h2>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="texto-sello text-tinta-tenue">Nombre</dt>
            <dd>{username}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="texto-sello text-tinta-tenue">Código</dt>
            <dd className="tracking-widest">{friendCode}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="texto-sello text-tinta-tenue">Correo</dt>
            <dd>{email}</dd>
          </div>
        </dl>
      </section>

      {/* ── Privacidad ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg">Privacidad</h2>
        <div className="mt-2 space-y-3">
          {Object.entries(ETIQUETAS_PRIVACIDAD).map(([clave, etiqueta]) => (
            <div key={clave}>
              <p className="text-sm">{etiqueta}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {OPCIONES.map((opcion) => (
                  <button
                    key={opcion.valor}
                    type="button"
                    className={
                      privacidad[clave] === opcion.valor ? 'chip chip-activo' : 'chip'
                    }
                    onClick={() =>
                      setPrivacidad((previa) => ({ ...previa, [clave]: opcion.valor }))
                    }
                  >
                    {opcion.etiqueta}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Avisos ─────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg">Avisos</h2>
        <p className="text-sm text-tinta-suave">
          Puedes apagar el push categoría por categoría. Lo que apagues seguirá esperándote
          dentro de la aplicación.
        </p>

        <div className="mt-3 space-y-2">
          {categorias.map((categoria) => (
            <div key={categoria.id} className="papel flex items-center gap-3 p-3">
              <span className="min-w-0 flex-1">
                <span className="block">{categoria.label}</span>
                <span className="texto-sello block text-tinta-tenue">
                  {categoria.descripcion}
                </span>
              </span>
              {categoria.obligatoria ? (
                <span className="texto-sello text-tinta-tenue">Siempre activo</span>
              ) : (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={activa(categoria.id, 'PUSH')}
                    onChange={(evento) => cambiar(categoria.id, 'PUSH', evento.target.checked)}
                  />
                  Push
                </label>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Horario silencioso ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg">No molestar</h2>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={silencio.activo}
            onChange={(evento) =>
              setSilencio((previo) => ({ ...previo, activo: evento.target.checked }))
            }
          />
          Nada de avisos por la noche
        </label>

        {silencio.activo ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span>De</span>
            <input
              type="time"
              className="campo"
              value={minutosAHora(silencio.desde)}
              onChange={(evento) =>
                setSilencio((previo) => ({ ...previo, desde: horaAMinutos(evento.target.value) }))
              }
            />
            <span>a</span>
            <input
              type="time"
              className="campo"
              value={minutosAHora(silencio.hasta)}
              onChange={(evento) =>
                setSilencio((previo) => ({ ...previo, hasta: horaAMinutos(evento.target.value) }))
              }
            />
            <span className="texto-sello text-tinta-tenue">en tu hora local</span>
          </div>
        ) : null}
      </section>

      <button type="button" className="btn btn-verde btn-lg w-full" onClick={() => void guardar()}>
        {guardado ? 'Guardado' : 'Guardar cambios'}
      </button>

      {/* ── Dispositivos ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg">Sesiones abiertas · {sesiones.length}</h2>
        <ul className="mt-2 space-y-2">
          {sesiones.map((sesion) => (
            <li key={sesion.id} className="papel p-3 text-sm">
              <span className="block">{sesion.dispositivo}</span>
              <span className="texto-sello text-tinta-tenue">
                desde {sesion.desde} · {new Date(sesion.ultimaVez).toLocaleDateString('es-ES')}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Borrar ─────────────────────────────────────────────────────────── */}
      <section className="border-t-2 border-linea-fuerte pt-6">
        <h2 className="text-lg text-granate">Borrar la cuenta</h2>
        <p className="mt-1 text-sm text-tinta-suave">
          Tienes 14 días para arrepentirte: si vuelves a entrar antes, se cancela. Después se
          borra todo lo tuyo y tus partidas dejan de tener nombre.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className="campo flex-1"
            value={confirmacion}
            onChange={(evento) => setConfirmacion(evento.target.value)}
            placeholder={`Escribe «${username}» para confirmar`}
            aria-label="Confirmación de borrado"
          />
          <button
            type="button"
            className="btn btn-rojo"
            disabled={confirmacion !== username}
            onClick={() => void borrar()}
          >
            Borrar mi cuenta
          </button>
        </div>
        {avisoBorrado ? <p className="mt-2 text-sm text-granate">{avisoBorrado}</p> : null}
      </section>
    </div>
  );
}
