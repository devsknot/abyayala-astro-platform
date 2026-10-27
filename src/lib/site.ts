// src/lib/site.ts
// Datos compartidos por el layout (footer, menús): se consultan una sola vez por petición.
import { getDb } from '../db';
import type { Category } from '../db/schema';
import { listCategories } from './repo/categories';

const perRequest = new WeakMap<App.Locals, Promise<Category[]>>();

export function getSiteCategories(locals: App.Locals): Promise<Category[]> {
  let promise = perRequest.get(locals);
  if (!promise) {
    promise = listCategories(getDb(locals)).catch((err) => {
      console.error('[site] No se pudieron cargar las categorías', err);
      return [];
    });
    perRequest.set(locals, promise);
  }
  return promise;
}
