/**
 * Tests de progresión: experiencia, antifarmeo y rachas.
 *
 * Lo que se comprueba no es que las fórmulas den un número concreto, sino que se cumplen
 * las promesas del diseño: que farmear no compensa, que jugar normal no se castiga, y que
 * perder una racha larga no destruye el progreso.
 */

import { describe, expect, it } from 'vitest';

import {
  DECRECIENTES,
  RECOMPENSAS,
  TOPES_DIARIOS,
  explicarRecorte,
  factorDelDia,
  partidaSignificativa,
  xpDeFuente,
  xpDePartida,
  type ContextoDia,
} from './libro';
import {
  DIAS_RECUPERACION,
  MAX_SEGUROS,
  RACHA_RECUPERABLE,
  SEGURO_CADA,
  diaLocal,
  diasEntre,
  rachaEnPeligro,
  rachaInicial,
  registrarActividad,
  textoRacha,
  type EstadoRacha,
} from './rachas';

const DIA_VACIO: ContextoDia = { concedidoHoy: {}, partidasHoy: 0 };

function partida(extra: Partial<Parameters<typeof xpDePartida>[0]> = {}) {
  return {
    gameId: `g-${Math.random().toString(36).slice(2, 8)}`,
    correctAnswers: 18,
    totalQuestions: 20,
    accuracyRatio: 0.9,
    averageDifficulty: 6,
    distinctTypes: 5,
    bestStreak: 7,
    finished: true,
    respuestas: 20,
    segundos: 400,
    ...extra,
  };
}

describe('experiencia', () => {
  it('una partida normal paga, y bien', () => {
    const concesion = xpDePartida(partida(), DIA_VACIO);
    expect(concesion.cantidad).toBeGreaterThan(0);
    expect(concesion.motivoRecorte).toBe('NINGUNO');
    expect(concesion.motivo).toBe('PARTIDA');
  });

  it('una partida de cuatro segundos no paga nada', () => {
    const concesion = xpDePartida(partida({ respuestas: 3, segundos: 4 }), DIA_VACIO);
    expect(concesion.cantidad).toBe(0);
    expect(concesion.motivoRecorte).toBe('NO_SIGNIFICATIVA');
    expect(explicarRecorte(concesion)).toContain('demasiado corta');
  });

  it('dos amigos no pueden farmear repitiendo partidas cortas', () => {
    // Diez partidas mínimas seguidas: la suma no puede acercarse al tope diario.
    let total = 0;
    for (let vuelta = 0; vuelta < 10; vuelta += 1) {
      const concesion = xpDePartida(partida({ respuestas: 4, segundos: 20 }), {
        concedidoHoy: { PARTIDA: total },
        partidasHoy: vuelta,
      });
      total += concesion.cantidad;
    }
    expect(total).toBe(0);
  });

  it('las partidas de más allá de las primeras del día pagan menos, pero nunca cero', () => {
    const primera = xpDePartida(partida(), { concedidoHoy: {}, partidasHoy: 0 });
    const octava = xpDePartida(partida(), { concedidoHoy: {}, partidasHoy: 8 });

    expect(octava.cantidad).toBeLessThan(primera.cantidad);
    expect(octava.cantidad).toBeGreaterThan(0);
    expect(octava.motivoRecorte).toBe('DECRECIENTE');
  });

  it('el factor decreciente respeta su suelo', () => {
    expect(factorDelDia(0)).toBe(1);
    expect(factorDelDia(DECRECIENTES.desdePartida - 1)).toBe(1);
    expect(factorDelDia(50)).toBe(DECRECIENTES.suelo);
  });

  it('el tope diario corta y se explica sin regañar', () => {
    const tope = TOPES_DIARIOS.PARTIDA ?? 0;
    const concesion = xpDePartida(partida(), {
      concedidoHoy: { PARTIDA: tope - 20 },
      partidasHoy: 0,
    });

    expect(concesion.cantidad).toBe(20);
    expect(concesion.recortado).toBeGreaterThan(0);
    expect(concesion.motivoRecorte).toBe('TOPE_DIARIO');

    const texto = explicarRecorte(concesion);
    expect(texto).toContain('Mañana');
    expect(texto?.toLowerCase()).not.toContain('demasiado'); // nada de reprimendas
  });

  it('los logros no tienen tope: no se repiten', () => {
    expect(TOPES_DIARIOS.LOGRO).toBeNull();
    const concesion = xpDeFuente('LOGRO', 'logro-1', RECOMPENSAS.logro, {
      concedidoHoy: { LOGRO: 99_999 },
      partidasHoy: 0,
    });
    expect(concesion.cantidad).toBe(RECOMPENSAS.logro);
  });

  it('la clave de idempotencia es motivo + origen', () => {
    const a = xpDeFuente('RETO_DIARIO', '2026-08-15', RECOMPENSAS.retoDiario, DIA_VACIO);
    const b = xpDeFuente('RETO_DIARIO', '2026-08-15', RECOMPENSAS.retoDiario, DIA_VACIO);
    // El módulo devuelve lo mismo; quien impide la segunda escritura es la clave única de
    // la tabla. Aquí se fija el contrato de qué la forma.
    expect(a.motivo).toBe(b.motivo);
    expect(a.sourceId).toBe(b.sourceId);
  });

  it('partidaSignificativa exige respuestas Y duración', () => {
    expect(partidaSignificativa({ respuestas: 20, segundos: 400 })).toBe(true);
    expect(partidaSignificativa({ respuestas: 20, segundos: 10 })).toBe(false);
    expect(partidaSignificativa({ respuestas: 2, segundos: 400 })).toBe(false);
  });
});

describe('racha diaria', () => {
  const HOY = '2026-08-15';

  it('el día es el LOCAL del usuario, no UTC', () => {
    // 00:30 del 15 en Madrid es todavía el 14 en UTC. La racha debe seguir al usuario.
    const instante = new Date('2026-08-14T22:30:00Z');
    expect(diaLocal(instante, 'Europe/Madrid')).toBe('2026-08-15');
    expect(diaLocal(instante, 'UTC')).toBe('2026-08-14');
  });

  it('una zona horaria inválida no revienta', () => {
    expect(diaLocal(new Date('2026-08-15T12:00:00Z'), 'Marte/Olympus')).toBe('2026-08-15');
  });

  it('empieza, continúa y no cuenta dos veces el mismo día', () => {
    let estado = rachaInicial();

    const primera = registrarActividad(estado, '2026-08-13');
    expect(primera.suceso).toBe('EMPIEZA');
    expect(primera.estado.actual).toBe(1);
    estado = primera.estado;

    const segunda = registrarActividad(estado, '2026-08-14');
    expect(segunda.suceso).toBe('CONTINUA');
    expect(segunda.estado.actual).toBe(2);
    estado = segunda.estado;

    const repetida = registrarActividad(estado, '2026-08-14');
    expect(repetida.suceso).toBe('YA_CONTABA_HOY');
    expect(repetida.estado.actual).toBe(2);
  });

  it('regala un seguro cada semana, con tope', () => {
    let estado = rachaInicial();
    let dia = new Date('2026-08-01T12:00:00Z');
    let segurosGanados = 0;

    for (let vuelta = 0; vuelta < 30; vuelta += 1) {
      const resultado = registrarActividad(estado, dia.toISOString().slice(0, 10));
      segurosGanados += resultado.segurosGanados;
      estado = resultado.estado;
      dia = new Date(dia.getTime() + 86_400_000);
    }

    expect(estado.actual).toBe(30);
    expect(segurosGanados).toBeGreaterThan(0);
    expect(estado.seguros).toBeLessThanOrEqual(MAX_SEGUROS);
    // A los 30 días se han cruzado varios múltiplos de SEGURO_CADA.
    expect(Math.floor(30 / SEGURO_CADA)).toBeGreaterThan(1);
  });

  it('el seguro cubre un día perdido sin pedir nada a cambio', () => {
    const estado: EstadoRacha = {
      actual: 9,
      mejor: 9,
      ultimoDia: '2026-08-13',
      seguros: 1,
      recuperacion: null,
    };

    // Se salta el 14 y vuelve el 15.
    const resultado = registrarActividad(estado, '2026-08-15');
    expect(resultado.suceso).toBe('SALVADA_POR_SEGURO');
    expect(resultado.estado.actual).toBe(10);
    expect(resultado.estado.seguros).toBe(0);
  });

  it('sin seguro, se rompe pero se abre misión de recuperación si era larga', () => {
    const estado: EstadoRacha = {
      actual: 12,
      mejor: 12,
      ultimoDia: '2026-08-10',
      seguros: 0,
      recuperacion: null,
    };

    const rota = registrarActividad(estado, HOY);
    expect(rota.suceso).toBe('ROTA');
    expect(rota.estado.actual).toBe(1);
    expect(rota.estado.mejor).toBe(12);
    expect(rota.estado.recuperacion).not.toBeNull();
    expect(rota.estado.recuperacion?.racha).toBe(12);
    expect(diasEntre(HOY, rota.estado.recuperacion?.hasta ?? HOY)).toBe(DIAS_RECUPERACION);
  });

  it('una racha corta se rompe sin drama y sin misión', () => {
    const estado: EstadoRacha = {
      actual: RACHA_RECUPERABLE - 1,
      mejor: 4,
      ultimoDia: '2026-08-01',
      seguros: 0,
      recuperacion: null,
    };
    const rota = registrarActividad(estado, HOY);
    expect(rota.estado.recuperacion).toBeNull();
  });

  it('completar la misión devuelve la racha entera', () => {
    let estado: EstadoRacha = {
      actual: 20,
      mejor: 20,
      ultimoDia: '2026-08-01',
      seguros: 0,
      recuperacion: null,
    };

    estado = registrarActividad(estado, '2026-08-10').estado; // rota, abre misión
    expect(estado.recuperacion?.hechos).toBe(1);

    estado = registrarActividad(estado, '2026-08-11').estado;
    const final = registrarActividad(estado, '2026-08-12');

    expect(final.suceso).toBe('RECUPERADA');
    expect(final.estado.actual).toBe(20);
    expect(final.estado.recuperacion).toBeNull();
  });

  it('detecta cuándo la racha está de verdad en peligro', () => {
    const enPeligro: EstadoRacha = {
      actual: 8,
      mejor: 8,
      ultimoDia: '2026-08-14',
      seguros: 0,
      recuperacion: null,
    };
    expect(rachaEnPeligro(enPeligro, HOY)).toBe(true);

    // Ya ha jugado hoy: no hay nada que recordarle.
    expect(rachaEnPeligro({ ...enPeligro, ultimoDia: HOY }, HOY)).toBe(false);
    // Racha de uno: no merece una notificación.
    expect(rachaEnPeligro({ ...enPeligro, actual: 1 }, HOY)).toBe(false);
  });

  it('el texto de la racha no inventa urgencias', () => {
    expect(textoRacha(rachaInicial())).toBe('Sin racha todavía');
    expect(textoRacha({ ...rachaInicial(), actual: 1 })).toContain('1 día');
    expect(textoRacha({ ...rachaInicial(), actual: 12 })).toContain('12 días');
  });
});
