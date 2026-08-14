/** Utilidades de tipos compartidas por el dominio. */

/**
 * `Omit` que se aplica a CADA miembro de una unión en lugar de colapsarla.
 * Necesario para trabajar con uniones discriminadas (acciones y eventos del motor):
 * `Omit<GameAction, 'at'>` perdería el discriminante; esto no.
 */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
