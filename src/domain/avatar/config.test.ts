import { describe, expect, it } from 'vitest';

import {
  ACCESORIOS,
  COLORES_PELO,
  COLORES_ROPA,
  COMBINACIONES,
  FONDOS,
  PELOS,
  ROPAS,
  TONOS_PIEL,
  avatarAleatorio,
  avatarPorDefecto,
  coloresDe,
  sanearAvatar,
} from './config';

describe('saneado del avatar', () => {
  it('acepta una configuración completa y válida tal cual', () => {
    const entrada = {
      cuerpo: 'ancho',
      altura: 'alta',
      cara: 'cuadrada',
      piel: 'oscura',
      cejas: 'pobladas',
      ojos: 'entornados',
      nariz: 'chata',
      boca: 'protesta',
      pelo: 'mono',
      colorPelo: 'canoso',
      ropa: 'bata',
      colorRopa: 'mostaza',
      accesorio: 'fregona',
      fondo: 'azotea',
      marco: 'oro',
    };
    expect(sanearAvatar(entrada)).toEqual(entrada);
  });

  it('cae al valor por defecto cuando la pieza no existe en el catálogo', () => {
    const saneado = sanearAvatar({ pelo: 'tupé-de-presentador', piel: '#ff0000' });
    expect(saneado.pelo).toBe('corto');
    expect(saneado.piel).toBe('media');
  });

  it('no explota con basura: null, texto, número, array', () => {
    for (const basura of [null, undefined, 'hola', 42, [], { a: { b: 1 } }]) {
      expect(() => sanearAvatar(basura)).not.toThrow();
      expect(sanearAvatar(basura).cara).toBe('ovalada');
    }
  });

  it('ignora campos de más en lugar de arrastrarlos', () => {
    const saneado = sanearAvatar({ pelo: 'melena', script: '<img onerror=alert(1)>' });
    expect(saneado.pelo).toBe('melena');
    expect(Object.keys(saneado).sort()).toEqual(Object.keys(avatarPorDefecto()).sort());
  });

  it('recorta cadenas absurdamente largas sin quedarse colgado', () => {
    const saneado = sanearAvatar({ ropa: 'x'.repeat(10_000) });
    expect(saneado.ropa).toBe('camisa');
  });

  it('es idempotente: sanear dos veces da lo mismo', () => {
    const una = sanearAvatar({ pelo: 'inventado', fondo: 'tablon' });
    expect(sanearAvatar(una)).toEqual(una);
  });
});

describe('avatar al azar', () => {
  it('siempre devuelve una configuración válida', () => {
    for (let i = 0; i < 200; i += 1) {
      const config = avatarAleatorio(i / 200);
      expect(sanearAvatar(config)).toEqual(config);
    }
  });

  it('con la misma semilla da el mismo vecino (hace falta para pintarlo en servidor)', () => {
    expect(avatarAleatorio(0.42)).toEqual(avatarAleatorio(0.42));
  });

  it('con semillas distintas da vecinos distintos', () => {
    const vistos = new Set<string>();
    for (let i = 1; i <= 40; i += 1) vistos.add(JSON.stringify(avatarAleatorio(i / 41)));
    // No exigimos 40 de 40 —el azar puede repetir— pero sí variedad real.
    expect(vistos.size).toBeGreaterThan(30);
  });

  it('nunca reparte marcos: el marco se desbloquea, no se sortea', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(avatarAleatorio(i / 50).marco).toBe('ninguno');
    }
  });
});

describe('colores resueltos', () => {
  it('devuelve hex de verdad para cualquier configuración válida', () => {
    const colores = coloresDe(avatarPorDefecto());
    for (const valor of Object.values(colores)) {
      expect(valor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('todos los catálogos con color traen hex bien formado', () => {
    for (const catalogo of [TONOS_PIEL, COLORES_PELO, COLORES_ROPA]) {
      for (const pieza of catalogo) {
        expect(pieza.hex, pieza.id).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
    for (const fondo of FONDOS) {
      expect(fondo.hex, fondo.id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(fondo.hex2, fondo.id).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('cae a un color válido aunque la configuración venga con un id imposible', () => {
    // `coloresDe` recibe configuraciones ya saneadas, pero no debe ser la única defensa.
    const colores = coloresDe({ ...avatarPorDefecto(), piel: 'transparente' });
    expect(colores.piel).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('catálogo', () => {
  it('no tiene ids repetidos', () => {
    for (const catalogo of [PELOS, ROPAS, ACCESORIOS, TONOS_PIEL, FONDOS, COLORES_PELO, COLORES_ROPA]) {
      const ids = catalogo.map((pieza) => pieza.id);
      expect(new Set(ids).size, ids.join(',')).toBe(ids.length);
    }
  });

  it('ofrece bastantes combinaciones para que dos vecinos no se repitan', () => {
    expect(COMBINACIONES).toBeGreaterThan(1_000_000);
  });

  it('incluye la opción de no llevar nada, que es la que más se usa', () => {
    expect(ACCESORIOS.some((pieza) => pieza.id === 'ninguno')).toBe(true);
  });
});
