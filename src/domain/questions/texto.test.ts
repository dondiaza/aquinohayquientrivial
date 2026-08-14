import { describe, expect, it } from 'vitest';

import { coincideRespuesta, compactarTexto, distanciaEdicion, normalizarTexto, pistaDeIniciales } from './texto';

describe('respuestas escritas', () => {
  it('normaliza tildes, mayúsculas, voladas y puntuación', () => {
    expect(normalizarTexto('José Luis Gil')).toBe('jose luis gil');
    expect(normalizarTexto('  MARIVÍ   BILBAO  ')).toBe('marivi bilbao');
    expect(normalizarTexto('2.º A')).toBe('2. a');
    expect(compactarTexto('2.º A')).toBe('2a');
    expect(compactarTexto('2ºA')).toBe('2a');
  });

  it('la distancia de edición corta a tiempo', () => {
    expect(distanciaEdicion('gil', 'gil', 2)).toBe(0);
    expect(distanciaEdicion('gill', 'gil', 2)).toBe(1);
    expect(distanciaEdicion('tejero', 'merlo', 2)).toBeGreaterThan(2);
  });

  it('acepta la misma respuesta escrita de varias formas razonables', () => {
    const casos: [string, boolean][] = [
      ['Mariví Bilbao', true],
      ['marivi bilbao', true],
      ['Marivi Bilbo', true], // una errata
      ['Bilbao', true], // forma aceptada declarada
      ['Gemma Cuervo', false],
      ['Mari', false],
    ];
    for (const [escrito, esperado] of casos) {
      expect(coincideRespuesta(escrito, 'Mariví Bilbao', ['Bilbao']).acierta, escrito).toBe(esperado);
    }
  });

  it('perdona el artículo de delante', () => {
    expect(coincideRespuesta('el videoclub', 'videoclub').acierta).toBe(true);
    expect(coincideRespuesta('videoclub', 'el videoclub').acierta).toBe(true);
  });

  it('no confunde dos zonas del edificio', () => {
    expect(coincideRespuesta('2ºA', '2.º A').acierta).toBe(true);
    expect(coincideRespuesta('2ºB', '2.º A').acierta).toBe(false);
    expect(coincideRespuesta('3.º A', '2.º A').acierta).toBe(false);
  });

  it('no da por buena una respuesta vacía', () => {
    expect(coincideRespuesta('', 'Antena 3').acierta).toBe(false);
    expect(coincideRespuesta('   ', 'Antena 3').acierta).toBe(false);
  });

  it('la pista de iniciales no revela la respuesta', () => {
    expect(pistaDeIniciales('José Luis Gil')).toBe('J··· L··· G··');
  });
});
