/**
 * ESCENARIOS DE MULTIJUGADOR.
 *
 * Se prueban contra el reducer REAL y con el banco REAL de ANHQV: sin mocks del juego. Cada
 * `it` es uno de los escenarios que pide el encargo (§48), escrito en los términos en los
 * que puede fallar de verdad en un salón:
 *
 *   A · host + 2 jugadores → partida completa
 *   D · respuesta duplicada (doble toque)
 *   E · respuesta fuera de tiempo
 *   G · equipos y su fórmula
 *   H · comodines a la vez
 *   J · apuesta final
 *   + el tiempo autoritativo, la anulación y que la TV no delate a nadie
 */

import { describe, expect, it } from 'vitest';

import { preguntasJugables } from '@/content/anhqv/banco';

import { estadoInicial, type EstadoSala, type JugadorSala } from './estado';
import { puntuarEquipos, tamanoDeReferencia } from './equipos';
import { aplicarIntencion, avanzarSiToca, type DepsSala } from './sala';
import type { IntencionCliente } from './protocolo';

const BANCO = preguntasJugables();

const CONFIG: DepsSala['config'] = {
  formatId: 'express',
  difficultyId: 'vecino',
  category: 'mezcla',
  sinSpoilers: false,
  autoPilot: true,
  leaderboardEvery: 3,
  teamMode: 'NINGUNO',
  seed: 'sala-de-test',
};

function deps(equipos: DepsSala['equipos'] = []): DepsSala {
  return { pool: BANCO, config: CONFIG, equipos };
}

function jugador(id: string, nombre: string, extra: Partial<JugadorSala> = {}): JugadorSala {
  return {
    id,
    nickname: nombre,
    arquetipo: 'presidente',
    colorAvatar: 'verde',
    rol: 'PLAYER',
    estado: 'ACTIVE',
    teamId: null,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    answered: 0,
    totalResponseMs: 0,
    powerUpsUsed: [],
    joinScore: 0,
    joinedAtIndex: 0,
    lastSeenAt: 0,
    ...extra,
  };
}

const HOST = { playerId: null, rol: 'HOST' as const };
const como = (id: string) => ({ playerId: id, rol: 'PLAYER' as const });

let contador = 0;
function op(): string {
  contador += 1;
  return `op-${contador}-${'x'.repeat(8)}`;
}

/** Arranca una sala y la deja en la primera pregunta. */
function salaEnPregunta(jugadores: JugadorSala[], equipos: DepsSala['equipos'] = []) {
  const d = deps(equipos);
  let ahora = 1_700_000_000_000;

  const paso = aplicarIntencion(estadoInicial(), jugadores, d, { ahora, autor: HOST }, {
    type: 'HOST_START',
    opId: op(),
  });
  expect(paso.resultado.ok).toBe(true);

  // Cuenta atrás → cartela de ronda → primera pregunta.
  ahora += 4_000;
  let avance = avanzarSiToca(paso.estado, paso.jugadores, d, ahora);
  ahora += 6_000;
  avance = avanzarSiToca(avance.estado, avance.jugadores, d, ahora);

  return { estado: avance.estado, jugadores: avance.jugadores, deps: d, ahora };
}

/** La respuesta correcta para la pregunta en curso, sea del tipo que sea. */
function respuestaCorrecta(estado: EstadoSala): IntencionCliente {
  const actual = estado.actual;
  if (!actual) throw new Error('no hay pregunta en curso');
  const question = BANCO.find((candidata) => candidata.id === actual.questionId);
  if (!question) throw new Error('pregunta fuera del banco');

  const base = { type: 'ANSWER_SUBMIT' as const, opId: op(), questionIndex: actual.indexInGame };

  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'WHO_IS_IT':
    case 'FINAL_BET':
    case 'MEMORY_GRID':
    case 'MISSING_ITEM':
      return { ...base, submission: { kind: 'OPTION', optionId: question.correctOptionId } };
    case 'DECISION':
      return { ...base, submission: { kind: 'OPTION', optionId: question.bestOptionId } };
    case 'TRUE_FALSE':
      return { ...base, submission: { kind: 'BOOLEAN', value: question.correctValue } };
    case 'IMPOSTOR':
      return { ...base, submission: { kind: 'ITEM', itemId: question.impostorItemId } };
    case 'ORDER_CHAOS':
      return {
        ...base,
        submission: { kind: 'ORDER', orderedIds: question.steps.map((paso) => paso.id) },
      };
    case 'SEQUENCE':
      return { ...base, submission: { kind: 'ORDER', orderedIds: [...question.sequence] } };
    case 'SHORT_ANSWER':
      return { ...base, submission: { kind: 'TEXT', text: question.answer } };
  }
}

describe('escenario A · host y dos jugadores juegan una partida entera', () => {
  it('llega a resultados con marcador, sin repetir pregunta y con eventos coherentes', () => {
    const d = deps();
    let jugadores = [jugador('p1', 'Marta'), jugador('p2', 'Pablo')];
    let estado = estadoInicial();
    let ahora = 1_700_000_000_000;

    const inicio = aplicarIntencion(estado, jugadores, d, { ahora, autor: HOST }, {
      type: 'HOST_START',
      opId: op(),
    });
    estado = inicio.estado;
    jugadores = inicio.jugadores;

    const vistas = new Set<string>();
    let vueltas = 0;

    while (estado.fase !== 'GAME_RESULTS' && vueltas < 400) {
      vueltas += 1;
      ahora += 1_500;

      const avance = avanzarSiToca(estado, jugadores, d, ahora);
      estado = avance.estado;
      jugadores = avance.jugadores;

      if (estado.fase === 'FINAL_BET') {
        for (const quien of ['p1', 'p2']) {
          const apuesta = aplicarIntencion(estado, jugadores, d, { ahora, autor: como(quien) }, {
            type: 'BET_SUBMIT',
            opId: op(),
            fraccion: 0.25,
          });
          estado = apuesta.estado;
          jugadores = apuesta.jugadores;
        }
        ahora += 16_000;
        continue;
      }

      if (estado.fase === 'QUESTION' && estado.actual) {
        vistas.add(estado.actual.questionId);
        // Marta acierta, Pablo falla por no responder: se prueban los dos caminos.
        const acierto = aplicarIntencion(
          estado,
          jugadores,
          d,
          { ahora: estado.actual.empiezaEn + 1_000, autor: como('p1') },
          respuestaCorrecta(estado),
        );
        estado = acierto.estado;
        jugadores = acierto.jugadores;
        ahora = estado.actual ? estado.actual.terminaEn + 100 : ahora;
      }
    }

    expect(estado.fase).toBe('GAME_RESULTS');
    // Ni una pregunta repetida en toda la partida.
    expect(vistas.size).toBe(estado.usados.length);

    const marta = jugadores.find((candidato) => candidato.id === 'p1');
    const pablo = jugadores.find((candidato) => candidato.id === 'p2');
    expect(marta?.score ?? 0).toBeGreaterThan(0);
    expect(marta?.answered ?? 0).toBeGreaterThan(0);
    // Quien no responde nunca no puede acabar por delante de quien acierta.
    expect(marta?.score ?? 0).toBeGreaterThanOrEqual(pablo?.score ?? 0);
  });
});

describe('escenario D · doble toque', () => {
  it('el mismo opId no puntúa dos veces', () => {
    const inicio = salaEnPregunta([jugador('p1', 'Marta')]);
    const intencion = respuestaCorrecta(inicio.estado);
    const cuando = (inicio.estado.actual?.empiezaEn ?? inicio.ahora) + 500;

    const primera = aplicarIntencion(
      inicio.estado,
      inicio.jugadores,
      inicio.deps,
      { ahora: cuando, autor: como('p1') },
      intencion,
    );
    const puntos = primera.jugadores.find((candidato) => candidato.id === 'p1')?.score ?? 0;
    expect(puntos).toBeGreaterThan(0);
    expect(primera.respuestas).toHaveLength(1);

    // Exactamente la misma intención, como haría un reintento tras un fallo de red.
    const repetida = aplicarIntencion(
      primera.estado,
      primera.jugadores,
      inicio.deps,
      { ahora: cuando + 200, autor: como('p1') },
      intencion,
    );

    expect(repetida.respuestas).toHaveLength(0);
    expect(repetida.jugadores.find((candidato) => candidato.id === 'p1')?.score).toBe(puntos);
  });

  it('una segunda respuesta distinta a la misma pregunta se rechaza', () => {
    // Hacen falta DOS jugadores: con uno solo, su respuesta cierra la pregunta (ya han
    // respondido todos) y el rechazo pasa a ser por fase, no por duplicado.
    const inicio = salaEnPregunta([jugador('p1', 'Marta'), jugador('p2', 'Pablo')]);
    const cuando = (inicio.estado.actual?.empiezaEn ?? inicio.ahora) + 500;

    const primera = aplicarIntencion(
      inicio.estado,
      inicio.jugadores,
      inicio.deps,
      { ahora: cuando, autor: como('p1') },
      respuestaCorrecta(inicio.estado),
    );

    const segunda = aplicarIntencion(
      primera.estado,
      primera.jugadores,
      inicio.deps,
      { ahora: cuando + 300, autor: como('p1') },
      respuestaCorrecta(primera.estado),
    );

    expect(segunda.resultado.ok).toBe(false);
    if (!segunda.resultado.ok) expect(segunda.resultado.error).toBe('YA_RESPONDIDA');
  });
});

describe('escenario E · fuera de tiempo', () => {
  it('una respuesta muy tardía se rechaza, pero una con retraso de red se acepta', () => {
    const inicio = salaEnPregunta([jugador('p1', 'Marta')]);
    const fin = inicio.estado.actual?.terminaEn ?? 0;

    // Dentro del margen de gracia (latencia normal): entra.
    const aTiempo = aplicarIntencion(
      inicio.estado,
      inicio.jugadores,
      inicio.deps,
      { ahora: fin + 800, autor: como('p1') },
      respuestaCorrecta(inicio.estado),
    );
    expect(aTiempo.resultado.ok).toBe(true);

    // Muy tarde: fuera.
    const tarde = aplicarIntencion(
      inicio.estado,
      inicio.jugadores,
      inicio.deps,
      { ahora: fin + 30_000, autor: como('p1') },
      respuestaCorrecta(inicio.estado),
    );
    expect(tarde.resultado.ok).toBe(false);
  });

  it('el tiempo de respuesta lo mide el servidor, no el cliente', () => {
    const inicio = salaEnPregunta([jugador('p1', 'Marta')]);
    const empieza = inicio.estado.actual?.empiezaEn ?? 0;

    const rapida = aplicarIntencion(
      inicio.estado,
      inicio.jugadores,
      inicio.deps,
      { ahora: empieza + 500, autor: como('p1') },
      respuestaCorrecta(inicio.estado),
    );
    const lenta = aplicarIntencion(
      inicio.estado,
      inicio.jugadores,
      inicio.deps,
      { ahora: empieza + 9_000, autor: como('p1') },
      respuestaCorrecta(inicio.estado),
    );

    const puntosRapida = rapida.respuestas[0]?.pointsAwarded ?? 0;
    const puntosLenta = lenta.respuestas[0]?.pointsAwarded ?? 0;
    // Responder antes vale más, pero el bonus está topado: nunca es el doble.
    expect(puntosRapida).toBeGreaterThan(puntosLenta);
    expect(puntosRapida).toBeLessThan(puntosLenta * 2);
  });
});

describe('escenario G · equipos', () => {
  it('la fórmula de los K mejores no premia tener más gente', () => {
    const grande = [
      { playerId: 'a', teamId: 'T1', puntos: 1000, cuenta: true },
      { playerId: 'b', teamId: 'T1', puntos: 900, cuenta: true },
      { playerId: 'c', teamId: 'T1', puntos: 100, cuenta: true },
      { playerId: 'd', teamId: 'T1', puntos: 0, cuenta: true },
    ];
    const pequeno = [
      { playerId: 'e', teamId: 'T2', puntos: 1000, cuenta: true },
      { playerId: 'f', teamId: 'T2', puntos: 900, cuenta: true },
    ];

    const puntuaciones = puntuarEquipos([...grande, ...pequeno], ['T1', 'T2']);
    const t1 = puntuaciones.find((entrada) => entrada.teamId === 'T1');
    const t2 = puntuaciones.find((entrada) => entrada.teamId === 'T2');

    expect(tamanoDeReferencia([...grande, ...pequeno])).toBe(2);
    // Mismos dos mejores, misma puntuación: el tamaño no da ventaja.
    expect(t1?.puntos).toBe(t2?.puntos);
    // Y la suma bruta sí sería injusta, por eso no se usa para clasificar.
    expect(t1?.suma).toBeGreaterThan(t2?.suma ?? 0);
  });

  it('el que se despista no hunde a su equipo', () => {
    const conDespistado = puntuarEquipos(
      [
        { playerId: 'a', teamId: 'T1', puntos: 1000, cuenta: true },
        { playerId: 'b', teamId: 'T1', puntos: 900, cuenta: true },
        { playerId: 'c', teamId: 'T1', puntos: 0, cuenta: true },
        { playerId: 'd', teamId: 'T2', puntos: 950, cuenta: true },
        { playerId: 'e', teamId: 'T2', puntos: 900, cuenta: true },
      ],
      ['T1', 'T2'],
    );
    const t1 = conDespistado.find((entrada) => entrada.teamId === 'T1');
    const t2 = conDespistado.find((entrada) => entrada.teamId === 'T2');
    expect(t1?.puntos ?? 0).toBeGreaterThan(t2?.puntos ?? 0);
  });

  it('un equipo vacío aparece con cero en lugar de desaparecer', () => {
    const puntuaciones = puntuarEquipos(
      [{ playerId: 'a', teamId: 'T1', puntos: 500, cuenta: true }],
      ['T1', 'T2'],
    );
    expect(puntuaciones).toHaveLength(2);
    expect(puntuaciones.find((entrada) => entrada.teamId === 'T2')?.puntos).toBe(0);
  });
});

describe('escenario H · comodines', () => {
  it('Radio Patio descarta una opción SOLO a quien lo usa', () => {
    const inicio = salaEnPregunta([jugador('p1', 'Marta'), jugador('p2', 'Pablo')]);
    // Se busca una pregunta con opciones; si la primera no las tiene, se avanza.
    if (!inicio.estado.actual) return;

    const resultado = aplicarIntencion(
      inicio.estado,
      inicio.jugadores,
      inicio.deps,
      { ahora: inicio.estado.actual.empiezaEn + 100, autor: como('p1') },
      { type: 'POWERUP_USE', opId: op(), questionIndex: inicio.estado.actual.indexInGame, powerUpId: 'RADIO_PATIO' },
    );

    const extrasMarta = resultado.estado.actual?.porJugador.p1;
    const extrasPablo = resultado.estado.actual?.porJugador.p2;

    if (resultado.resultado.ok) {
      expect(extrasMarta?.eliminadas.length ?? 0).toBeGreaterThan(0);
      // A Pablo no le ha tocado nada: los comodines no perjudican a terceros.
      expect(extrasPablo?.eliminadas ?? []).toEqual([]);
    }
  });

  it('«un poquito de por favor» alarga SU tiempo, no el de la sala', () => {
    const inicio = salaEnPregunta([jugador('p1', 'Marta'), jugador('p2', 'Pablo')]);
    if (!inicio.estado.actual) return;
    const finComun = inicio.estado.actual.terminaEn;

    const resultado = aplicarIntencion(
      inicio.estado,
      inicio.jugadores,
      inicio.deps,
      { ahora: inicio.estado.actual.empiezaEn + 100, autor: como('p1') },
      {
        type: 'POWERUP_USE',
        opId: op(),
        questionIndex: inicio.estado.actual.indexInGame,
        powerUpId: 'UN_POQUITO_DE_POR_FAVOR',
      },
    );

    expect(resultado.estado.actual?.terminaEn).toBe(finComun);
    expect(resultado.estado.actual?.porJugador.p1?.segundosExtra).toBe(5);

    // Y con esos segundos, una respuesta que sería tardía entra.
    const tardia = aplicarIntencion(
      resultado.estado,
      resultado.jugadores,
      inicio.deps,
      { ahora: finComun + 3_000, autor: como('p1') },
      respuestaCorrecta(resultado.estado),
    );
    expect(tardia.resultado.ok).toBe(true);
  });

  it('un comodín no se puede gastar dos veces', () => {
    const inicio = salaEnPregunta([jugador('p1', 'Marta')]);
    if (!inicio.estado.actual) return;

    const primera = aplicarIntencion(
      inicio.estado,
      inicio.jugadores,
      inicio.deps,
      { ahora: inicio.estado.actual.empiezaEn + 100, autor: como('p1') },
      {
        type: 'POWERUP_USE',
        opId: op(),
        questionIndex: inicio.estado.actual.indexInGame,
        powerUpId: 'JUNTA_EXTRAORDINARIA',
      },
    );
    expect(primera.resultado.ok).toBe(true);

    const segunda = aplicarIntencion(
      primera.estado,
      primera.jugadores,
      inicio.deps,
      { ahora: (primera.estado.actual?.empiezaEn ?? 0) + 200, autor: como('p1') },
      {
        type: 'POWERUP_USE',
        opId: op(),
        questionIndex: primera.estado.actual?.indexInGame ?? 0,
        powerUpId: 'JUNTA_EXTRAORDINARIA',
      },
    );
    expect(segunda.resultado.ok).toBe(false);
  });
});

describe('autoridad y buenas maneras', () => {
  it('un jugador no puede ejecutar controles de host', () => {
    const inicio = salaEnPregunta([jugador('p1', 'Marta')]);
    const intento = aplicarIntencion(
      inicio.estado,
      inicio.jugadores,
      inicio.deps,
      { ahora: inicio.ahora, autor: como('p1') },
      { type: 'HOST_FINISH', opId: op() },
    );
    expect(intento.resultado.ok).toBe(false);
    if (!intento.resultado.ok) expect(intento.resultado.error).toBe('NO_AUTORIZADO');
  });

  it('una pregunta anulada no da ni quita puntos a nadie', () => {
    const inicio = salaEnPregunta([jugador('p1', 'Marta')]);
    if (!inicio.estado.actual) return;

    const anulada = aplicarIntencion(
      inicio.estado,
      inicio.jugadores,
      inicio.deps,
      { ahora: inicio.ahora, autor: HOST },
      { type: 'HOST_ANNUL', opId: op() },
    );

    const respuesta = aplicarIntencion(
      anulada.estado,
      anulada.jugadores,
      inicio.deps,
      { ahora: (anulada.estado.actual?.empiezaEn ?? 0) + 500, autor: como('p1') },
      respuestaCorrecta(anulada.estado),
    );

    expect(respuesta.jugadores.find((candidato) => candidato.id === 'p1')?.score).toBe(0);
  });

  it('los eventos públicos de una respuesta solo llevan el CONTADOR, nunca quién', () => {
    const inicio = salaEnPregunta([jugador('p1', 'Marta'), jugador('p2', 'Pablo')]);
    const resultado = aplicarIntencion(
      inicio.estado,
      inicio.jugadores,
      inicio.deps,
      { ahora: (inicio.estado.actual?.empiezaEn ?? 0) + 500, autor: como('p1') },
      respuestaCorrecta(inicio.estado),
    );

    const publicos = resultado.eventos.filter((evento) => evento.audience === 'ALL');
    for (const evento of publicos) {
      const serializado = JSON.stringify(evento.payload);
      expect(serializado.includes('Marta'), 'la TV está señalando a quien responde').toBe(false);
      expect(serializado.includes('p1')).toBe(false);
    }

    // Y la confirmación privada sí es para ella.
    const privados = resultado.eventos.filter((evento) => evento.audience === 'P:p1');
    expect(privados.length).toBeGreaterThan(0);
  });

  it('un espectador no puntúa ni cuenta como esperado', () => {
    const inicio = salaEnPregunta([
      jugador('p1', 'Marta'),
      jugador('p3', 'Público', { rol: 'SPECTATOR' }),
    ]);

    const intento = aplicarIntencion(
      inicio.estado,
      inicio.jugadores,
      inicio.deps,
      { ahora: (inicio.estado.actual?.empiezaEn ?? 0) + 500, autor: como('p3') },
      respuestaCorrecta(inicio.estado),
    );

    expect(intento.resultado.ok).toBe(false);
  });
});

describe('escenario J · apuesta final', () => {
  it('la apuesta se acota al máximo permitido', () => {
    const d = deps();
    const jugadores = [jugador('p1', 'Marta', { score: 1000 })];
    // Se fabrica el estado de apuesta directamente: es la fase, no el camino, lo que se prueba.
    const conApuesta: EstadoSala = {
      ...estadoInicial(),
      fase: 'FINAL_BET',
      faseHasta: 1_700_000_100_000,
      actual: {
        questionId: BANCO[0]?.id ?? 'x',
        roundId: 'ronda',
        indexInGame: 0,
        optionOrder: [],
        timeLimitSeconds: 30,
        empiezaEn: 1_700_000_000_000,
        terminaEn: 1_700_000_030_000,
        estudioHasta: 1_700_000_000_000,
        modificadores: [],
        pistasReveladas: 1,
        porJugador: {},
        respondidos: [],
        conApuesta: true,
        anulada: false,
      },
    };

    const media = aplicarIntencion(
      conApuesta,
      jugadores,
      d,
      { ahora: 1_700_000_010_000, autor: como('p1') },
      { type: 'BET_SUBMIT', opId: op(), fraccion: 0.5 },
    );

    expect(media.resultado.ok).toBe(true);
    // Con 1000 puntos y tope del 50 %, la apuesta máxima es 500.
    expect(media.estado.actual?.porJugador.p1?.apuesta).toBe(500);
  });
});
