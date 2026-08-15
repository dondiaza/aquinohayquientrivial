import { describe, expect, it } from 'vitest';

import { MANIFIESTO } from '@/content/media/manifiesto';
import { LISTA_DE_DESEOS } from '@/content/media/wishlist';
import {
  ESTADOS_SERVIBLES,
  ESTADOS_USO,
  LICENCIAS_ADMITIDAS,
  esServible,
  requiereAtribucion,
  type MediaAsset,
} from './tipos';

/**
 * Estas pruebas no comprueban que la web se vea bonita: comprueban que no publicamos una
 * imagen cuyo permiso no consta. Es la regla que no se puede romper por descuido, así que
 * está escrita como prueba y no como buena intención en un comentario.
 */

const base: MediaAsset = {
  id: 'prueba',
  type: 'image',
  category: 'character',
  title: 'Prueba',
  tags: [],
  usageStatus: 'placeholder',
};

describe('estados de uso', () => {
  it('«pending» no está entre los servibles: es lo que impide publicar sin permiso', () => {
    expect(ESTADOS_SERVIBLES).not.toContain('pending');
    expect(esServible({ ...base, usageStatus: 'pending' })).toBe(false);
  });

  it('deja servir lo que sí tiene permiso o es nuestro', () => {
    for (const estado of ['user-provided', 'authorized', 'licensed', 'original', 'placeholder'] as const) {
      expect(esServible({ ...base, usageStatus: estado }), estado).toBe(true);
    }
  });

  it('todo estado servible es un estado conocido', () => {
    for (const estado of ESTADOS_SERVIBLES) expect(ESTADOS_USO).toContain(estado);
  });

  it('lo licenciado y lo autorizado exige atribución; lo original y el hueco, no', () => {
    expect(requiereAtribucion({ ...base, usageStatus: 'licensed' })).toBe(true);
    expect(requiereAtribucion({ ...base, usageStatus: 'authorized' })).toBe(true);
    expect(requiereAtribucion({ ...base, usageStatus: 'original' })).toBe(false);
    expect(requiereAtribucion({ ...base, usageStatus: 'placeholder' })).toBe(false);
  });
});

describe('el manifiesto', () => {
  it('no tiene ids repetidos', () => {
    const ids = MANIFIESTO.map((asset) => asset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('nada que se pinte está en estado «pending»', () => {
    for (const asset of MANIFIESTO) {
      if (esServible(asset)) expect(asset.usageStatus, asset.id).not.toBe('pending');
    }
  });

  it('todo lo licenciado trae licencia admitida, atribución y fecha de verificación', () => {
    const licenciados = MANIFIESTO.filter((asset) => asset.usageStatus === 'licensed');
    for (const asset of licenciados) {
      expect(asset.license, `${asset.id} sin licencia`).toBeTruthy();
      expect(LICENCIAS_ADMITIDAS, `${asset.id}: licencia no admitida`).toContain(asset.license!);
      expect(asset.attribution, `${asset.id} sin atribución`).toBeTruthy();
      expect(asset.sourceUrl, `${asset.id} sin origen`).toMatch(/^https?:\/\//);
      expect(asset.verifiedAt, `${asset.id} sin fecha de verificación`).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      );
    }
  });

  it('todo lo que apunta a un fichero local lo apunta bajo /media', () => {
    for (const asset of MANIFIESTO) {
      if (asset.localPath) expect(asset.localPath, asset.id).toMatch(/^\/media\//);
    }
  });

  it('lo dibujado por nosotros no arrastra URL de origen ajena', () => {
    for (const asset of MANIFIESTO) {
      if (asset.usageStatus === 'original') expect(asset.sourceUrl, asset.id).toBeUndefined();
    }
  });
});

describe('la lista de deseos', () => {
  it('cada deseo dice de dónde viene y qué haría falta para poder usarlo', () => {
    for (const deseo of LISTA_DE_DESEOS) {
      expect(deseo.sourcePage, deseo.id).toMatch(/^https?:\/\//);
      expect(deseo.describe.length, deseo.id).toBeGreaterThan(10);
      expect(deseo.motivo.length, deseo.id).toBeGreaterThan(10);
      expect(deseo.queHaceFalta.length, deseo.id).toBeGreaterThan(10);
      expect(deseo.registradoEl, deseo.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('ningún deseo se ha colado en el manifiesto como si tuviera permiso', () => {
    const ids = new Set(MANIFIESTO.map((asset) => asset.id));
    for (const deseo of LISTA_DE_DESEOS) expect(ids.has(deseo.id), deseo.id).toBe(false);
  });
});
