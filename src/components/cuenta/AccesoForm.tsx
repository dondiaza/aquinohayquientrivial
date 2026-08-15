'use client';

/**
 * ACCESO EN DOS PASOS: correo y código. Sin contraseña.
 *
 * Detalles que importan más de lo que parecen:
 *
 *   · el segundo paso no pierde el correo escrito, para no obligar a teclearlo otra vez;
 *   · el campo del código admite pegar con guion o sin él;
 *   · cuando se hereda progreso, se DICE lo que se ha conservado. Registrarse da un poco de
 *     miedo justo por eso: por si se pierde lo jugado.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AccesoForm({ volverA = '/perfil' }: { volverA?: string }) {
  const router = useRouter();
  const [paso, setPaso] = useState<'correo' | 'codigo'>('correo');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heredado, setHeredado] = useState<{ partidas: number; xp: number } | null>(null);

  const pedir = async (): Promise<void> => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/cuenta/acceso', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const datos = (await respuesta.json()) as { mensaje?: string; codigoDesarrollo?: string };
      setAviso(datos.mensaje ?? 'Te hemos mandado un código.');
      if (datos.codigoDesarrollo) {
        // Solo en desarrollo sin proveedor de correo: se rellena para poder probar.
        setCodigo(datos.codigoDesarrollo);
      }
      setPaso('codigo');
    } catch {
      setError('No hemos podido mandar el código. Revisa la conexión.');
    } finally {
      setCargando(false);
    }
  };

  const canjear = async (): Promise<void> => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/cuenta/canjear', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          codigo,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const datos = (await respuesta.json()) as {
        ok: boolean;
        mensaje?: string;
        migrado?: { partidas: number; xp: number } | null;
      };

      if (!datos.ok) {
        setError(datos.mensaje ?? 'Ese código no vale.');
        return;
      }

      if (datos.migrado && datos.migrado.partidas > 0) {
        setHeredado(datos.migrado);
        setTimeout(() => router.push(volverA), 2200);
        return;
      }

      router.push(volverA);
      router.refresh();
    } catch {
      setError('No hemos podido entrar. Inténtalo otra vez.');
    } finally {
      setCargando(false);
    }
  };

  if (heredado) {
    return (
      <div className="papel p-6 text-center">
        <p className="texto-cartel text-2xl text-verde-portal">Progreso a salvo</p>
        <p className="mt-2 text-tinta-suave">
          Has conservado {heredado.partidas} partidas y {heredado.xp} de experiencia.
        </p>
        <p className="texto-sello mt-4 text-tinta-tenue">Entrando en tu ficha…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {paso === 'correo' ? (
        <>
          <label htmlFor="email" className="texto-sello block text-tinta-tenue">
            Tu correo
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className="campo w-full text-lg"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter' && email.includes('@')) void pedir();
            }}
            placeholder="vecino@ejemplo.com"
          />
          <button
            type="button"
            className="btn btn-rojo btn-lg w-full"
            disabled={cargando || !email.includes('@')}
            onClick={() => void pedir()}
          >
            {cargando ? 'Mandando…' : 'Mandarme un código'}
          </button>
          <p className="text-xs text-tinta-tenue">
            Sin contraseña. Te mandamos un código de un solo uso que caduca en 15 minutos.
          </p>
        </>
      ) : (
        <>
          {aviso ? <p className="text-sm text-tinta-suave">{aviso}</p> : null}
          <label htmlFor="codigo" className="texto-sello block text-tinta-tenue">
            Código
          </label>
          <input
            id="codigo"
            className="campo w-full text-center text-2xl tracking-[0.25em]"
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value.toUpperCase())}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter' && codigo.length >= 8) void canjear();
            }}
            autoComplete="one-time-code"
            autoCapitalize="characters"
            placeholder="XXXX-XXXX"
          />
          <button
            type="button"
            className="btn btn-rojo btn-lg w-full"
            disabled={cargando || codigo.replace(/[^A-Z0-9]/g, '').length < 8}
            onClick={() => void canjear()}
          >
            {cargando ? 'Entrando…' : 'Entrar'}
          </button>
          <button
            type="button"
            className="btn btn-fantasma w-full"
            onClick={() => {
              setPaso('correo');
              setCodigo('');
              setError(null);
            }}
          >
            Usar otro correo
          </button>
        </>
      )}

      {error ? <p className="text-sm text-rojo-buzon">{error}</p> : null}
    </div>
  );
}
