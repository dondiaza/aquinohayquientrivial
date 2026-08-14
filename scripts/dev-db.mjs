/**
 * PostgreSQL local para desarrollo, sin Docker y sin instalar nada en el sistema.
 * Usa los binarios de `embedded-postgres` (dependencia de desarrollo) y guarda los
 * datos en ./.pgdata (ignorado por git).
 *
 *   npm run db:up      arranca y deja el servidor en primer plano (Ctrl+C para parar)
 *
 * Puerto 5434 por defecto para no chocar con otros proyectos del equipo que usan 5432.
 * Si prefieres tu propio PostgreSQL, no necesitas este script: apunta DATABASE_URL
 * a tu servidor y listo.
 *
 * IMPORTANTE — CODIFICACIÓN: en Windows, `initdb` toma la del sistema (WIN1252), y
 * entonces PostgreSQL RECHAZA guardar cualquier carácter fuera de ese juego (los emoji
 * de los rangos, por ejemplo, con error 22P05). Por eso el clúster se crea siempre en
 * UTF8 con locale C. Si tu .pgdata es anterior a este cambio, bórralo y vuelve a
 * ejecutar `npm run db:up` (y después `npm run setup`).
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

import EmbeddedPostgres from 'embedded-postgres';

const DATA_DIR = path.resolve(process.cwd(), '.pgdata');
const PORT = Number.parseInt(process.env.PGPORT ?? '5434', 10);
const DB_NAME = process.env.PGDATABASE ?? 'ahqv_trivial';

const postgres = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: 'postgres',
  password: 'postgres',
  port: PORT,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: () => {},
});

const firstRun = !existsSync(DATA_DIR);

if (firstRun) {
  console.log('· Preparando el clúster por primera vez…');
  await postgres.initialise();
}

console.log(`· Arrancando PostgreSQL en el puerto ${PORT}…`);
await postgres.start();

try {
  await postgres.createDatabase(DB_NAME);
  console.log(`· Base de datos "${DB_NAME}" creada.`);
} catch {
  console.log(`· Base de datos "${DB_NAME}" ya existente.`);
}

// Comprobación explícita: si el clúster viene de una versión anterior del script,
// avisamos en vez de fallar más tarde con un error de codificación indescifrable.
const client = postgres.getPgClient(DB_NAME);
try {
  await client.connect();
  const { rows } = await client.query('SHOW server_encoding');
  const encoding = rows[0]?.server_encoding;
  if (encoding !== 'UTF8') {
    console.warn('');
    console.warn(`  ⚠  El clúster está en ${encoding}, no en UTF8.`);
    console.warn('     Bórralo y vuelve a crearlo para evitar errores al guardar texto:');
    console.warn('       Ctrl+C, borra la carpeta .pgdata y ejecuta de nuevo npm run db:up');
    console.warn('');
  }
} catch {
  // Si la comprobación falla no pasa nada: el servidor ya está en marcha.
} finally {
  await client.end().catch(() => {});
}

console.log('');
console.log('  LISTO — PostgreSQL escuchando.');
console.log(`  DATABASE_URL="postgresql://postgres:postgres@localhost:${PORT}/${DB_NAME}?schema=public"`);
console.log('');
console.log('  Deja esta ventana abierta. En otra terminal:');
console.log('    npm run setup && npm run dev');
console.log('');
console.log('  Ctrl+C para detener el servidor.');

let stopping = false;
async function stop(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`\n· Deteniendo PostgreSQL (${signal})…`);
  try {
    await postgres.stop();
  } catch (error) {
    console.error('· No se ha podido detener limpiamente:', error);
  }
  process.exit(0);
}

process.on('SIGINT', () => void stop('SIGINT'));
process.on('SIGTERM', () => void stop('SIGTERM'));

// Mantiene el proceso vivo mientras el servidor está en marcha.
setInterval(() => {}, 1 << 30);
