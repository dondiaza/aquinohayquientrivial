/**
 * La vista de sala trae `arquetipo` y `colorAvatar` como cadenas (vienen de la base de
 * datos, donde son texto). El avatar de Fase 2 los quiere como literales del catálogo.
 *
 * En lugar de castear a ciegas se comprueba contra el catálogo y se cae al valor por
 * defecto: un dato raro en la base de datos pinta un avatar genérico, no revienta la tele.
 */

import { ARQUETIPOS, COLORES_AVATAR, type ArquetipoId, type ColorAvatarId } from '@/domain/players/avatar';

export function comoArquetipo(valor: string): ArquetipoId {
  const encontrado = ARQUETIPOS.find((opcion) => opcion.id === valor);
  return encontrado ? encontrado.id : 'presidente';
}

export function comoColor(valor: string): ColorAvatarId {
  const encontrado = COLORES_AVATAR.find((opcion) => opcion.id === valor);
  return encontrado ? encontrado.id : 'verde';
}
