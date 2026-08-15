'use client';

/**
 * ENTRAR EN UNA SALA — el camino de los diez segundos.
 *
 * Objetivo del enunciado: desde escanear el QR hasta el lobby, unos diez segundos. Por eso:
 *
 *   · si vienes por QR el código ya está puesto y solo queda el nombre;
 *   · el nombre se propone solo (avatar aleatorio incluido) y se puede aceptar tal cual;
 *   · nada de email, contraseña, cuenta ni fecha de nacimiento;
 *   · si ya habías entrado en esta sala desde este móvil, se te reconoce y entras directo.
 *
 * El teclado del móvil se abre en el campo correcto y el código se normaliza mientras se
 * escribe, así que da igual si lo teclea en minúsculas o con un guion en medio.
 */

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { NeighbourAvatar } from '@/components/portal/Avatar';
import { LONGITUD_CODIGO, normalizarCodigo } from '@/domain/party/codigo';
import { ARQUETIPOS, COLORES_AVATAR } from '@/domain/players/avatar';
import { NICK_MAX } from '@/domain/party/saneado';
import { almacen } from '@/lib/sala/useSala';

import { comoArquetipo, comoColor } from './avatar';

/** Nombres sugeridos: cosas del portal, nunca personajes de la serie. */
const SUGERENCIAS = [
  'Vecino del 3.º',
  'La del 1.º B',
  'Portería',
  'El del ático',
  'Radio Patio',
  'Junta',
  'La escalera',
  'El buzón',
];

export function Entrar({ codeInicial = '' }: { codeInicial?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(normalizarCodigo(codeInicial));
  const [nickname, setNickname] = useState('');
  const [arquetipo, setArquetipo] = useState<string>('presidente');
  const [color, setColor] = useState<string>('verde');
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codigoCompleto = code.length === LONGITUD_CODIGO;

  // Avatar y nombre propuestos: se puede entrar sin tocar nada.
  useEffect(() => {
    const azar = Math.floor(Math.random() * SUGERENCIAS.length);
    setNickname(SUGERENCIAS[azar] ?? 'Vecino');
    const arque = ARQUETIPOS[Math.floor(Math.random() * ARQUETIPOS.length)];
    const col = COLORES_AVATAR[Math.floor(Math.random() * COLORES_AVATAR.length)];
    if (arque) setArquetipo(arque.id);
    if (col) setColor(col.id);
  }, []);

  // Si ya estabas en esta sala desde este móvil, no se pregunta nada: se entra.
  useEffect(() => {
    if (!codigoCompleto) return;
    const guardada = almacen.leer(code);
    if (guardada) router.replace(`/sala/${code}`);
  }, [code, codigoCompleto, router]);

  const entrar = async (): Promise<void> => {
    if (!codigoCompleto || entrando) return;
    setEntrando(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/salas/${code}/unirse`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nickname,
          arquetipo,
          colorAvatar: color,
          token: almacen.leer(code)?.token ?? null,
        }),
      });
      const datos = (await respuesta.json()) as
        | { ok: true; token: string; playerId: string; nickname: string }
        | { ok: false; mensaje: string };

      if (!datos.ok) {
        setError(datos.mensaje);
        setEntrando(false);
        return;
      }

      almacen.guardar(code, {
        token: datos.token,
        playerId: datos.playerId,
        nickname: datos.nickname,
      });
      router.push(`/sala/${code}`);
    } catch {
      setError('Estamos intentando volver al portal…');
      setEntrando(false);
    }
  };

  const arquetipoValido = useMemo(() => comoArquetipo(arquetipo), [arquetipo]);
  const colorValido = useMemo(() => comoColor(color), [color]);

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="codigo" className="texto-sello block text-tinta-tenue">
          Código de la comunidad
        </label>
        <input
          id="codigo"
          className="campo mt-1 w-full text-center text-5xl tracking-[0.3em]"
          value={code}
          onChange={(evento) => setCode(normalizarCodigo(evento.target.value))}
          placeholder="····"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={LONGITUD_CODIGO + 4}
          aria-describedby="ayuda-codigo"
        />
        <p id="ayuda-codigo" className="texto-sello mt-1 text-tinta-tenue">
          Cuatro caracteres. Los verás en la pantalla grande.
        </p>
      </div>

      {codigoCompleto ? (
        <>
          <div>
            <label htmlFor="nombre" className="texto-sello block text-tinta-tenue">
              ¿Cómo te llamamos?
            </label>
            <input
              id="nombre"
              className="campo mt-1 w-full text-xl"
              value={nickname}
              onChange={(evento) => setNickname(evento.target.value)}
              maxLength={NICK_MAX}
              autoComplete="off"
              enterKeyHint="go"
              onKeyDown={(evento) => {
                if (evento.key === 'Enter') void entrar();
              }}
            />
          </div>

          <div>
            <p className="texto-sello text-tinta-tenue">Tu cara en el portal</p>
            <div className="mt-2 flex items-center gap-4">
              <NeighbourAvatar
                arquetipo={arquetipoValido}
                color={colorValido}
                marco="ninguno"
                tamano={72}
              />
              <div className="flex flex-wrap gap-1">
                {ARQUETIPOS.map((opcion) => (
                  <button
                    key={opcion.id}
                    type="button"
                    className={arquetipo === opcion.id ? 'chip chip-activo' : 'chip'}
                    onClick={() => setArquetipo(opcion.id)}
                  >
                    {opcion.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {COLORES_AVATAR.map((opcion) => (
                <button
                  key={opcion.id}
                  type="button"
                  className={color === opcion.id ? 'chip chip-activo' : 'chip'}
                  onClick={() => setColor(opcion.id)}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {error ? <p className="text-sm text-rojo-buzon">{error}</p> : null}

      <button
        type="button"
        className="btn btn-rojo btn-xl w-full"
        disabled={!codigoCompleto || entrando || nickname.trim().length < 2}
        onClick={() => void entrar()}
      >
        {entrando ? 'Subiendo…' : 'Entrar en la junta'}
      </button>
    </div>
  );
}
