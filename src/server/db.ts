import { PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma único por proceso. En desarrollo, Next recarga los módulos en cada
 * cambio; sin este cacheo en `globalThis` se abrirían decenas de conexiones.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
