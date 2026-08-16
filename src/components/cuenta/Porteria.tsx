'use client';

/**
 * LA PORTERÍA — quién eres, siempre en la cabecera.
 *
 * ## El problema que resuelve
 *
 * La pantalla de acceso existía desde hacía tres fases y solo se llegaba a ella desde una
 * barra del ranking. En toda la web no había forma de saber si estabas identificado ni de
 * guardar el progreso: alguien podía jugar veinte partidas, cambiar de móvil y perderlo todo
 * sin haber visto nunca la palabra «cuenta».
 *
 * Ahora está en la cabecera, en todas las pantallas, y dice una de dos cosas:
 *
 *   · **sin cuenta** — un botón que explica qué pasa si no la creas, no qué es una cuenta;
 *   · **con cuenta** — tu cara y tu nombre, que es la confirmación de que lo jugado está a
 *     salvo.
 *
 * ## Por qué el formulario se abre aquí y no en otra página
 *
 * Mandar a alguien a `/entrar` en mitad de una partida es perderlo. El panel se despliega
 * sobre la pantalla en la que ya está, se escribe el correo y se vuelve donde estaba. Se usa
 * `<details>` para el desplegable: funciona sin JavaScript, se cierra con Escape y el
 * navegador ya sabe hacerlo mejor que yo.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Props = {
  /** Nombre de usuario si hay sesión. */
  username: string | null;
  /** Cuánto hay en juego, para que el aviso sea concreto y no genérico. */
  porGuardar: { partidas: number; xp: number } | null;
};

export function Porteria({ username, porGuardar }: Props) {
  if (username) return <Identificado username={username} />;
  return <SinCuenta porGuardar={porGuardar} />;
}

function Identificado({ username }: { username: string }) {
  return (
    <Link
      href="/perfil"
      className="texto-sello inline-flex shrink-0 items-center gap-1.5 border-2 border-verde-portal bg-papel px-2 py-1.5 text-verde-portal hover:brightness-105"
      title="Tu ficha de vecino"
    >
      <span aria-hidden>🔑</span>
      <span className="max-w-[7rem] truncate">{username}</span>
    </Link>
  );
}

function SinCuenta({ porGuardar }: { porGuardar: { partidas: number; xp: number } | null }) {
  const router = useRouter();
  const detalles = useRef<HTMLDetailsElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  const [paso, setPaso] = useState<'correo' | 'codigo'>('correo');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);

  // Al abrir, el cursor ya está en el correo: un toque menos.
  useEffect(() => {
    const nodo = detalles.current;
    if (!nodo) return;
    const alAbrir = () => {
      if (nodo.open) setTimeout(() => campo.current?.focus(), 40);
    };
    nodo.addEventListener('toggle', alAbrir);
    return () => nodo.removeEventListener('toggle', alAbrir);
  }, []);

  // Cerrar al pulsar fuera. Un desplegable que se queda abierto tapando la pantalla molesta
  // más que ayudar.
  useEffect(() => {
    const fuera = (evento: MouseEvent) => {
      const nodo = detalles.current;
      if (nodo?.open && !nodo.contains(evento.target as Node)) nodo.open = false;
    };
    document.addEventListener('click', fuera);
    return () => document.removeEventListener('click', fuera);
  }, []);

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setCargando(true);
    setError(null);
    try {
      if (paso === 'correo') {
        const respuesta = await fetch('/api/cuenta/acceso', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const datos = (await respuesta.json()) as { codigoDesarrollo?: string; mensaje?: string };
        if (!respuesta.ok) {
          setError(datos.mensaje ?? 'No hemos podido mandar el código.');
          return;
        }
        if (datos.codigoDesarrollo) setCodigo(datos.codigoDesarrollo);
        setPaso('codigo');
        return;
      }

      const respuesta = await fetch('/api/cuenta/canjear', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          codigo,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const datos = (await respuesta.json()) as { mensaje?: string; username?: string };
      if (!respuesta.ok) {
        setError(datos.mensaje ?? 'Ese código no vale. Pide otro.');
        return;
      }
      setListo(datos.username ?? 'Listo');
      // Se refresca en el sitio: quien estaba jugando sigue jugando, ya identificado.
      router.refresh();
    } catch {
      setError('Sin conexión. Vuelve a intentarlo.');
    } finally {
      setCargando(false);
    }
  };

  const hay = porGuardar && (porGuardar.partidas > 0 || porGuardar.xp > 0);

  return (
    <details ref={detalles} className="relative shrink-0">
      <summary
        className="texto-sello inline-flex cursor-pointer list-none items-center gap-1.5 border-2 border-rojo-buzon bg-rojo-buzon px-2 py-1.5 text-papel marker:content-none hover:brightness-110"
        title="Guardar tu progreso"
      >
        <span aria-hidden>💾</span>
        <span className="hidden sm:inline">Guardar mi progreso</span>
        <span className="sm:hidden">Guardar</span>
      </summary>

      <div className="fixed inset-x-2 top-16 z-50 mx-auto w-[min(21rem,calc(100vw-1rem))] border-2 border-tinta bg-papel p-4 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2">
        {listo ? (
          <div>
            <p className="texto-cartel text-lg">Guardado, {listo}</p>
            <p className="mt-1 text-sm text-tinta-suave">
              Lo jugado ya está atado a tu cuenta. Entra desde cualquier móvil con el mismo
              correo y sigue donde lo dejaste.
            </p>
            <p className="mt-3">
              <Link href="/perfil" className="btn btn-verde btn-sm">
                Ver mi ficha
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={enviar}>
            <p className="texto-cartel text-base leading-tight">
              {hay
                ? `Tienes ${porGuardar!.partidas} ${porGuardar!.partidas === 1 ? 'partida' : 'partidas'} y ${porGuardar!.xp} XP sin guardar`
                : 'Guarda lo que juegues'}
            </p>
            <p className="mt-1 text-sm text-tinta-suave">
              {hay
                ? 'Si cambias de móvil o borras los datos del navegador, se pierde. Con el correo se queda.'
                : 'Sin cuenta, lo que juegues vive solo en este navegador. Con el correo te sigue a cualquier móvil.'}
            </p>

            {paso === 'correo' ? (
              <>
                <label htmlFor="porteria-correo" className="texto-sello mt-3 block text-tinta-tenue">
                  Tu correo
                </label>
                <input
                  ref={campo}
                  id="porteria-correo"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(evento) => setEmail(evento.target.value)}
                  className="mt-1 w-full border-2 border-tinta bg-papel-alto px-3 py-2"
                />
                <p className="texto-sello mt-1 text-[0.6rem] text-tinta-tenue">
                  Sin contraseña. Te mandamos un código de un solo uso.
                </p>
              </>
            ) : (
              <>
                <label htmlFor="porteria-codigo" className="texto-sello mt-3 block text-tinta-tenue">
                  Código enviado a {email}
                </label>
                <input
                  id="porteria-codigo"
                  type="text"
                  required
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  placeholder="000000"
                  value={codigo}
                  onChange={(evento) => setCodigo(evento.target.value)}
                  className="marcador mt-1 w-full border-2 border-tinta bg-papel-alto px-3 py-2 text-center text-xl tracking-[0.3em]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPaso('correo');
                    setError(null);
                  }}
                  className="texto-sello mt-1 text-[0.6rem] text-tinta-tenue underline"
                >
                  Cambiar de correo
                </button>
              </>
            )}

            {error ? (
              <p role="alert" className="mt-2 text-sm text-rojo-buzon">
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={cargando} className="btn btn-rojo mt-3 w-full">
              {cargando ? 'Un momento…' : paso === 'correo' ? 'Mandarme el código' : 'Entrar'}
            </button>
          </form>
        )}
      </div>
    </details>
  );
}
