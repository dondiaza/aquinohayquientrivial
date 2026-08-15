/**
 * Tests del motor de notificaciones.
 *
 * Aquí no se comprueba que «funciona»: se comprueba que NO molesta. Cada test es una de las
 * promesas del diseño, escrita como la situación real en la que se rompería.
 */

import { describe, expect, it } from 'vitest';

import {
  CATEGORIAS_OBLIGATORIAS,
  REGLAS,
  TIPOS_NOTIFICACION,
  redactar,
} from './catalogo';
import {
  INACTIVIDAD,
  TOPES_PUSH,
  decidirCanales,
  enSilencio,
  minutosLocales,
  momentoParaRecordatorio,
  type HistorialEnvios,
  type PreferenciasUsuario,
} from './motor';

const PREFERENCIAS: PreferenciasUsuario = {
  activa: () => true,
  silencioActivo: true,
  silencioDesde: 23 * 60,
  silencioHasta: 9 * 60,
  timezone: 'Europe/Madrid',
};

const HISTORIAL: HistorialEnvios = {
  pushEngancheHoy: 0,
  pushEngancheSemana: 0,
  ultimoDeEsteTipo: null,
  diasInactivo: 0,
};

/** Las 20:00 en Madrid: hora de jugar, no de dormir. */
const TARDE = new Date('2026-08-15T18:00:00Z');
/** Las 03:00 en Madrid. */
const MADRUGADA = new Date('2026-08-15T01:00:00Z');

describe('horario silencioso', () => {
  it('calcula la hora local del usuario, no la del servidor', () => {
    expect(minutosLocales(TARDE, 'Europe/Madrid')).toBe(20 * 60);
    expect(minutosLocales(TARDE, 'UTC')).toBe(18 * 60);
  });

  it('entiende un silencio que cruza la medianoche', () => {
    expect(enSilencio(MADRUGADA, PREFERENCIAS)).toBe(true);
    expect(enSilencio(TARDE, PREFERENCIAS)).toBe(false);
  });

  it('se puede desactivar', () => {
    expect(enSilencio(MADRUGADA, { ...PREFERENCIAS, silencioActivo: false })).toBe(false);
  });

  it('a las tres de la mañana no se manda un recordatorio de racha', () => {
    const decision = decidirCanales('STREAK_AT_RISK', PREFERENCIAS, HISTORIAL, MADRUGADA);
    expect(decision.push).toBe(false);
    expect(decision.motivos.PUSH).toBe('SILENCIO');
    // Pero el buzón sí se escribe: al entrar por la mañana lo verá.
    expect(decision.inApp).toBe(true);
  });

  it('una invitación a una partida en vivo sí puede sonar de noche', () => {
    const decision = decidirCanales('ROOM_INVITE_CREATED', PREFERENCIAS, HISTORIAL, MADRUGADA);
    expect(decision.push).toBe(true);
  });
});

describe('el buzón nunca se salta', () => {
  it('aunque el usuario haya apagado todo, la notificación queda dentro de la app', () => {
    const todoApagado: PreferenciasUsuario = { ...PREFERENCIAS, activa: () => false };
    for (const tipo of TIPOS_NOTIFICACION) {
      const decision = decidirCanales(tipo, todoApagado, HISTORIAL, TARDE);
      expect(decision.push, `${tipo} manda push con todo apagado`).toBe(false);
      if (REGLAS[tipo].canales.includes('IN_APP')) {
        expect(decision.inApp, `${tipo} no deja rastro en el buzón`).toBe(true);
      }
    }
  });
});

describe('topes de frecuencia', () => {
  it('el tercer push de enganche del día no sale', () => {
    const decision = decidirCanales(
      'DAILY_AVAILABLE',
      PREFERENCIAS,
      { ...HISTORIAL, pushEngancheHoy: TOPES_PUSH.engancheDia },
      TARDE,
    );
    expect(decision.push).toBe(false);
    expect(decision.motivos.PUSH).toBe('TOPE_DIARIO');
  });

  it('un reto de un amigo NO gasta el tope de enganche', () => {
    const decision = decidirCanales(
      'CHALLENGE_CREATED',
      PREFERENCIAS,
      { ...HISTORIAL, pushEngancheHoy: 99, pushEngancheSemana: 99 },
      TARDE,
    );
    // Es un hecho, no una invitación a volver: alguien ha hecho algo por ti.
    expect(decision.push).toBe(true);
  });

  it('no se repite el mismo recordatorio dos veces en un día', () => {
    const decision = decidirCanales(
      'STREAK_AT_RISK',
      PREFERENCIAS,
      { ...HISTORIAL, ultimoDeEsteTipo: TARDE.getTime() - 60_000 },
      TARDE,
    );
    expect(decision.push).toBe(false);
    expect(decision.motivos.PUSH).toBe('REPETIDO');
  });
});

describe('a quien no vuelve, se le deja en paz', () => {
  it('a la semana sin jugar, se reduce', () => {
    const decision = decidirCanales(
      'DAILY_AVAILABLE',
      PREFERENCIAS,
      { ...HISTORIAL, diasInactivo: INACTIVIDAD.reducirDesde, pushEngancheSemana: 1 },
      TARDE,
    );
    expect(decision.push).toBe(false);
    expect(decision.motivos.PUSH).toBe('INACTIVO_REDUCIDO');
  });

  it('a las tres semanas, se para del todo', () => {
    const decision = decidirCanales(
      'WEEKLY_AVAILABLE',
      PREFERENCIAS,
      { ...HISTORIAL, diasInactivo: INACTIVIDAD.pararDesde },
      TARDE,
    );
    expect(decision.push).toBe(false);
    expect(decision.motivos.PUSH).toBe('INACTIVO');
  });

  it('pero un amigo que le invita sí le llega, lleve el tiempo que lleve', () => {
    const decision = decidirCanales(
      'ROOM_INVITE_CREATED',
      PREFERENCIAS,
      { ...HISTORIAL, diasInactivo: 200 },
      TARDE,
    );
    expect(decision.push).toBe(true);
  });
});

describe('catálogo', () => {
  it('los cambios pequeños de liga no mandan push', () => {
    expect(REGLAS.LEAGUE_POSITION_CHANGED.canales).not.toContain('PUSH');
  });

  it('solo seguridad es obligatoria', () => {
    expect(CATEGORIAS_OBLIGATORIAS).toEqual(['sistema']);
    expect(REGLAS.ACCOUNT_SECURITY.categoria).toBe('sistema');
  });

  it('ninguna notificación lleva a la portada', () => {
    for (const tipo of TIPOS_NOTIFICACION) {
      const enlace = REGLAS[tipo].deepLink;
      expect(enlace, `${tipo} no tiene destino`).toBeTruthy();
      expect(enlace, `${tipo} lleva a la portada`).not.toBe('/');
    }
  });

  it('los textos dicen el motivo y no gritan', () => {
    const reto = redactar('CHALLENGE_CREATED', { quien: 'Marta', puntos: 8420, id: 'd1' });
    expect(reto.titulo).toContain('Marta');
    expect(reto.cuerpo).toContain('8420');
    expect(reto.deepLink).toBe('/desafio/d1');

    for (const tipo of TIPOS_NOTIFICACION) {
      const texto = redactar(tipo, { quien: 'Pablo', id: 'x', code: '4K7P' });
      expect(texto.titulo.length, `${tipo} sin título`).toBeGreaterThan(0);
      // Nada de «¡¡ENTRA YA!!»: como mucho un signo de exclamación, y ninguno en mayúsculas.
      expect((texto.titulo.match(/!/g) ?? []).length).toBeLessThan(2);
      expect(texto.titulo).not.toBe(texto.titulo.toUpperCase());
    }
  });

  it('el deep link sustituye los parámetros', () => {
    expect(redactar('ROOM_INVITE_CREATED', { quien: 'Lucía', code: '4K7P' }).deepLink).toBe(
      '/unirse/4K7P',
    );
  });
});

describe('cuándo mandar el recordatorio', () => {
  it('apunta a un rato antes de su hora habitual', () => {
    expect(momentoParaRecordatorio(21 * 60, PREFERENCIAS)).toBe(20 * 60 + 30);
  });

  it('si no se sabe, usa una hora razonable y nunca de madrugada', () => {
    expect(momentoParaRecordatorio(null, PREFERENCIAS)).toBe(19 * 60);
    // Alguien que juega a las 23:30 no recibe el aviso a las 23:00: se corre al final del silencio.
    expect(momentoParaRecordatorio(23 * 60 + 30, PREFERENCIAS)).toBe(PREFERENCIAS.silencioHasta);
  });
});
