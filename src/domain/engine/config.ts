/**
 * Configuración de partida: lo que elige el jugador en /jugar/solo y lo que viaja a la
 * API. Validado con Zod en los dos extremos (formulario y route handler).
 */

import { z } from 'zod';

import { CATEGORY_SELECTIONS } from '../questions/categories';
import { DEFAULT_DIFFICULTY_LEVEL, DIFFICULTY_LEVEL_IDS } from '../difficulty/levels';
import { DEFAULT_FORMAT, GAME_FORMAT_IDS } from '../rounds/formats';
import type { GameConfig } from './state';

export const gameSetupSchema = z.object({
  formatId: z.enum(GAME_FORMAT_IDS).default(DEFAULT_FORMAT),
  difficultyId: z.enum(DIFFICULTY_LEVEL_IDS).default(DEFAULT_DIFFICULTY_LEVEL),
  category: z.enum(CATEGORY_SELECTIONS).default('mezcla'),
  adaptiveDifficulty: z.boolean().default(true),
  /**
   * Modo sin spoilers. Lo pide la guía del pack: si está activo, no sale ninguna pregunta
   * marcada como destripe grave (muertes, bodas decisivas y final de la serie).
   */
  sinSpoilers: z.boolean().default(false),
  playerName: z.string().trim().min(1).max(24).optional(),
});

export type GameSetup = z.infer<typeof gameSetupSchema>;

export const gameConfigSchema = gameSetupSchema.extend({
  mode: z.enum(['SOLO', 'PARTY']).default('SOLO'),
  seed: z.string().min(1).max(64),
});

export function parseGameConfig(value: unknown): GameConfig {
  return gameConfigSchema.parse(value);
}

export const DEFAULT_SETUP: GameSetup = {
  formatId: DEFAULT_FORMAT,
  difficultyId: DEFAULT_DIFFICULTY_LEVEL,
  category: 'mezcla',
  adaptiveDifficulty: true,
  sinSpoilers: false,
};
