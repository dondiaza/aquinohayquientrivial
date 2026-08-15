'use client';

/**
 * PANEL DE VECINOS.
 *
 * Tres cosas y nada más: tu código para que te añadan, las solicitudes pendientes y la lista.
 * No hay muro, ni mensajes, ni sugerencias de gente que no conoces: los amigos aquí sirven
 * para jugar (§66).
 *
 * Los estados vacíos dicen algo, en lugar de dejar un hueco en blanco.
 */

import { useState } from 'react';

import { NeighbourAvatar } from '@/components/portal/Avatar';
import { comoArquetipo, comoColor } from '@/components/sala/avatar';
import { Chip } from '@/components/ui/Surfaces';

type Amigo = {
  userId: string;
  username: string;
  nivel: number;
  arquetipo: string;
  colorAvatar: string;
  racha: number;
  presencia: 'disponible' | 'jugando' | 'desconectado' | 'oculta';
};

type Solicitud = {
  id: string;
  username: string;
  arquetipo: string;
  colorAvatar: string;
  nivel: number;
};

const PRESENCIA: Record<Amigo['presencia'], { punto: string; texto: string }> = {
  disponible: { punto: '🟢', texto: 'Disponible' },
  jugando: { punto: '🟡', texto: 'Jugando' },
  desconectado: { punto: '⚫', texto: 'Desconectado' },
  oculta: { punto: '', texto: '' },
};

export function PanelAmigos({
  friendCode,
  inicialAmigos,
  inicialSolicitudes,
}: {
  friendCode: string;
  inicialAmigos: Amigo[];
  inicialSolicitudes: Solicitud[];
}) {
  const [amigos, setAmigos] = useState(inicialAmigos);
  const [solicitudes, setSolicitudes] = useState(inicialSolicitudes);
  const [codigo, setCodigo] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const recargar = async (): Promise<void> => {
    const respuesta = await fetch('/api/amigos', { cache: 'no-store' });
    const datos = (await respuesta.json()) as {
      ok: boolean;
      amigos: Amigo[];
      solicitudes: Solicitud[];
    };
    if (datos.ok) {
      setAmigos(datos.amigos);
      setSolicitudes(datos.solicitudes);
    }
  };

  const actuar = async (cuerpo: Record<string, unknown>): Promise<void> => {
    setAviso(null);
    const respuesta = await fetch('/api/amigos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    const datos = (await respuesta.json()) as { ok: boolean; mensaje?: string };
    if (!datos.ok) setAviso(datos.mensaje ?? 'No se ha podido.');
    else await recargar();
  };

  return (
    <div className="mt-6 space-y-8">
      <section>
        <h2 className="text-lg">Tu código</h2>
        <p className="text-sm text-tinta-suave">Dáselo a quien quieras que te añada.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="marcador border-2 border-tinta bg-papel px-4 py-2 text-2xl tracking-widest">
            {friendCode}
          </span>
          <button
            type="button"
            className="btn btn-papel"
            onClick={() => {
              void navigator.clipboard?.writeText(friendCode);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1800);
            }}
          >
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg">Añadir un vecino</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            className="campo flex-1"
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value.toUpperCase())}
            placeholder="PACO-82K7"
            autoComplete="off"
            aria-label="Código de amigo"
          />
          <button
            type="button"
            className="btn btn-verde"
            disabled={codigo.length < 5}
            onClick={() => {
              void actuar({ accion: 'solicitar', codigo });
              setCodigo('');
            }}
          >
            Enviar solicitud
          </button>
        </div>
        {aviso ? <p className="mt-2 text-sm text-rojo-buzon">{aviso}</p> : null}
      </section>

      {solicitudes.length > 0 ? (
        <section>
          <h2 className="text-lg">Te han solicitado</h2>
          <ul className="mt-2 space-y-2">
            {solicitudes.map((solicitud) => (
              <li key={solicitud.id} className="papel flex items-center gap-3 p-3">
                <NeighbourAvatar
                  arquetipo={comoArquetipo(solicitud.arquetipo)}
                  color={comoColor(solicitud.colorAvatar)}
                  marco="ninguno"
                  tamano={44}
                />
                <span className="flex-1">
                  <span className="block">{solicitud.username}</span>
                  <span className="texto-sello text-tinta-tenue">Nivel {solicitud.nivel}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-verde"
                  onClick={() => void actuar({ accion: 'aceptar', requestId: solicitud.id })}
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  className="btn btn-fantasma"
                  onClick={() => void actuar({ accion: 'rechazar', requestId: solicitud.id })}
                >
                  Ahora no
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg">En el rellano · {amigos.length}</h2>

        {amigos.length === 0 ? (
          <div className="papel mt-2 p-6 text-center">
            <p className="texto-cartel text-xl">El rellano está muy tranquilo</p>
            <p className="mt-2 text-sm text-tinta-suave">
              Pásale tu código a alguien y empezad a picaros.
            </p>
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {amigos.map((amigo) => (
              <li key={amigo.userId} className="papel flex items-center gap-3 p-3">
                <NeighbourAvatar
                  arquetipo={comoArquetipo(amigo.arquetipo)}
                  color={comoColor(amigo.colorAvatar)}
                  marco="ninguno"
                  tamano={44}
                />
                <span className="min-w-0 flex-1">
                  <a href={`/perfil/${amigo.username}`} className="block truncate underline">
                    {amigo.username}
                  </a>
                  <span className="texto-sello text-tinta-tenue">
                    Nivel {amigo.nivel}
                    {amigo.racha > 1 ? ` · 🔥 ${amigo.racha}` : ''}
                  </span>
                </span>
                {amigo.presencia !== 'oculta' ? (
                  <Chip title={PRESENCIA[amigo.presencia].texto}>
                    {PRESENCIA[amigo.presencia].punto}
                  </Chip>
                ) : null}
                <button
                  type="button"
                  className="btn btn-fantasma"
                  onClick={() => void actuar({ accion: 'eliminar', userId: amigo.userId })}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
