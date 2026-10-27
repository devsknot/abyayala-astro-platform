// src/db/index.ts
// Punto de acceso único a D1 a través de Drizzle.
import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Database = ReturnType<typeof createDb>;

function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

const cache = new WeakMap<D1Database, Database>();

/** Devuelve la instancia de Drizzle para el binding DB de la petición actual. */
export function getDb(locals: App.Locals): Database {
  const d1 = locals.runtime?.env?.DB;
  if (!d1) throw new Error('El binding DB de D1 no está configurado');
  let db = cache.get(d1);
  if (!db) {
    db = createDb(d1);
    cache.set(d1, db);
  }
  return db;
}

export { schema };
