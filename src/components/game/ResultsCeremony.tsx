'use client';

import { useEffect, useState } from 'react';

import { Chip } from '@/components/ui/Surfaces';
import { CommunityStamp, PaperNotice } from '@/components/portal/Estructuras';
import {
  GameShowBanner,
  RarityBadge,
  ReactionBurst,
  ScoreTicker,
} from '@/components/portal/Espectaculo';
import { NeighbourAvatar } from '@/components/portal/Avatar';
import { anuncioFinal } from '@/domain/copy/announcer';
import { logroPorId } from '@/domain/achievements/achievements';
import { progresoDeRango, rangoPorId, siguienteRango } from '@/domain/progression/progression';
import { useAudio } from '@/lib/audio/AudioProvider';
import { useReducedMotion } from '@/lib/motion';
import type { ArquetipoId } from '@/domain/players/avatar';

export type DatosCeremonia = {
  puntos: number;
  precision: number;
  correctas: number;
  totalPreguntas: number;
  mejorRacha: number;
  tiempoMedioMs: number;
  masRapidaMs: number | null;
  dificultadMedia: number;
  bonus: number;
  apuesta: number;
  comodines: number;
  rangoPartidaLabel: string;
  rangoPartidaIcono: string;
  rangoPartidaLinea: string;
  rendimiento: number;
  categoriaFavorita: string | null;
  categoriaDificil: string | null;
  xpGanada: number;
  xpTotal: number;
  rangoJugadorId: string;
  esRecord: boolean;
  recordAnterior: number | null;
  logros: string[];
  avatar: { arquetipo: ArquetipoId; color: string; marco: string } | null;
  nombre: string | null;
  datoCurioso: string;
};

/**
 * CEREMONIA DE RESULTADOS — el acta se lee por partes, no de golpe (§33).
 *
 * Cada bloque entra con un retardo escalonado: la puntuación primero, después la
 * precisión, los logros, la experiencia y el dato curioso. Con `prefers-reduced-motion`
 * aparece todo a la vez, sin perder ni un dato.
 */
export function ResultsCeremony({ datos }: { datos: DatosCeremonia }) {
  const { sonar } = useAudio();
  const reducido = useReducedMotion();
  const [celebrar, setCelebrar] = useState(false);
  const rango = rangoPorId(datos.rangoJugadorId);
  const siguiente = siguienteRango(datos.xpTotal);
  const progreso = progresoDeRango(datos.xpTotal);

  // Un único sello sonoro al abrir el acta, y chispas solo si hay motivo.
  useEffect(() => {
    const id = setTimeout(() => {
      sonar('ranking');
      if (datos.esRecord || datos.logros.length > 0) {
        sonar('sello');
        setCelebrar(true);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [sonar, datos.esRecord, datos.logros.length]);

  const retardo = (indice: number): { animationDelay: string } | undefined =>
    reducido ? undefined : { animationDelay: `${indice * 180}ms` };

  return (
    <div className="space-y-4">
      <GameShowBanner
        kicker="Acta de la partida"
        titulo={datos.esRecord ? '¡Récord del portal!' : datos.rangoPartidaLabel}
        linea={anuncioFinal(datos.rendimiento, datos.precision / 100)}
        tono={datos.esRecord ? 'granate' : 'mostaza'}
      />

      {/* Puntuación */}
      <div className="relative">
        {celebrar ? (
          <ReactionBurst activo intensidad={datos.esRecord ? 4 : 2} tono="mostaza" />
        ) : null}
        <PaperNotice tono="papel" className="anim-aparecer p-5 text-center" >
          <p className="texto-sello text-tinta-tenue">Puntos totales</p>
          <ScoreTicker valor={datos.puntos} className="block text-[clamp(3rem,14vw,5.5rem)] text-verde-portal" />
          {datos.recordAnterior !== null ? (
            <p className="texto-sello mt-1 text-tinta-tenue">
              Tu récord anterior: {datos.recordAnterior}
            </p>
          ) : null}
          {datos.esRecord ? (
            <p className="mt-3 flex justify-center">
              <CommunityStamp titulo="Récord" linea="del portal" rareza="legendario" animado />
            </p>
          ) : null}
        </PaperNotice>
      </div>

      {/* Rango de la partida */}
      <PaperNotice tono="mostaza" giro="izq" sujecion="chincheta" className="anim-aparecer p-4 pt-5 text-center" >
        <p aria-hidden className="text-4xl">
          {datos.rangoPartidaIcono}
        </p>
        <p className="texto-cartel text-2xl">{datos.rangoPartidaLabel}</p>
        <p className="mt-1 text-sm text-tinta-suave">{datos.rangoPartidaLinea}</p>
        <p className="texto-sello mt-2 text-tinta-tenue">
          Rendimiento {Math.round(datos.rendimiento * 100)} %
        </p>
      </PaperNotice>

      {/* Números, escalonados */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {[
          { etiqueta: 'Aciertos', valor: `${datos.precision} %`, pie: `${datos.correctas}/${datos.totalPreguntas}` },
          { etiqueta: 'Mejor racha', valor: String(datos.mejorRacha) },
          {
            etiqueta: 'Tiempo medio',
            valor: datos.tiempoMedioMs > 0 ? `${(datos.tiempoMedioMs / 1000).toFixed(1)} s` : '—',
          },
          {
            etiqueta: 'La más rápida',
            valor: datos.masRapidaMs !== null ? `${(datos.masRapidaMs / 1000).toFixed(1)} s` : '—',
          },
          { etiqueta: 'Dificultad media', valor: `${datos.dificultadMedia}/10` },
          { etiqueta: 'Puntos de bonus', valor: String(datos.bonus) },
          {
            etiqueta: 'Saldo apuestas',
            valor: datos.apuesta === 0 ? '—' : `${datos.apuesta > 0 ? '+' : ''}${datos.apuesta}`,
          },
          { etiqueta: 'Comodines', valor: String(datos.comodines) },
        ].map((dato, indice) => (
          <div
            key={dato.etiqueta}
            className="papel anim-aparecer p-3"
            style={retardo(indice)}
          >
            <p className="texto-sello text-tinta-tenue">{dato.etiqueta}</p>
            <p className="marcador text-2xl">{dato.valor}</p>
            {dato.pie ? <p className="text-xs text-tinta-suave">{dato.pie}</p> : null}
          </div>
        ))}
      </div>

      {/* Categorías */}
      {datos.categoriaFavorita || datos.categoriaDificil ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {datos.categoriaFavorita ? (
            <PaperNotice tono="verde" className="anim-aparecer p-3">
              <p className="texto-sello">Se te da bien</p>
              <p className="texto-cartel text-lg">{datos.categoriaFavorita}</p>
            </PaperNotice>
          ) : null}
          {datos.categoriaDificil ? (
            <PaperNotice tono="rosa" className="anim-aparecer p-3">
              <p className="texto-sello">A repasar</p>
              <p className="texto-cartel text-lg">{datos.categoriaDificil}</p>
            </PaperNotice>
          ) : null}
        </div>
      ) : null}

      {/* Logros desbloqueados */}
      {datos.logros.length > 0 ? (
        <PaperNotice tono="azul" className="anim-aparecer p-4">
          <p className="texto-sello">Logros desbloqueados</p>
          <ul className="mt-2 space-y-2">
            {datos.logros.map((id, indice) => {
              const logro = logroPorId(id);
              if (!logro) return null;
              return (
                <li
                  key={id}
                  className="anim-aparecer-escala flex items-center gap-2"
                  style={retardo(indice + 2)}
                >
                  <span aria-hidden className="text-2xl">
                    {logro.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{logro.label}</span>
                    <span className="block text-xs text-tinta-suave">{logro.descripcion}</span>
                  </span>
                  <RarityBadge rareza={logro.rareza}>nuevo</RarityBadge>
                </li>
              );
            })}
          </ul>
        </PaperNotice>
      ) : null}

      {/* Experiencia y rango del jugador */}
      <PaperNotice tono="papel" className="anim-aparecer p-4">
        <div className="flex items-center gap-3">
          {datos.avatar ? (
            <NeighbourAvatar
              arquetipo={datos.avatar.arquetipo}
              color={datos.avatar.color}
              marco={datos.avatar.marco}
              tamano={64}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="texto-sello text-tinta-tenue">
              {datos.nombre ?? 'Vecino anónimo'} · {rango.icon} {rango.label}
            </p>
            <p className="marcador text-xl text-verde-portal">+{datos.xpGanada} XP</p>
            <div className="barra-tiempo mt-1 h-2.5">
              <span style={{ width: `${progreso * 100}%`, background: 'var(--color-verde-claro)' }} />
            </div>
            <p className="texto-sello mt-1 text-[0.6rem] text-tinta-tenue">
              {siguiente
                ? `${datos.xpTotal} / ${siguiente.xp} XP hacia ${siguiente.label}`
                : `${datos.xpTotal} XP · rango máximo`}
            </p>
          </div>
        </div>
      </PaperNotice>

      {/* Dato curioso */}
      <PaperNotice tono="mostaza" giro="der" className="anim-aparecer p-3">
        <p className="texto-sello">Dato para la próxima junta</p>
        <p className="escrito-a-mano text-xl">{datos.datoCurioso}</p>
      </PaperNotice>

      <p className="flex flex-wrap gap-1.5">
        <Chip>{datos.totalPreguntas} preguntas</Chip>
        <Chip>{datos.correctas} correctas</Chip>
        <Chip>racha {datos.mejorRacha}</Chip>
      </p>
    </div>
  );
}
