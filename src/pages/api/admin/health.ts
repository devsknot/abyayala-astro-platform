// src/pages/api/admin/health.ts
// GET /api/admin/health?issue=withoutAuthor → artículos afectados por un indicador del dashboard.
// Requiere sesión (todo /api/admin/* está protegido en el middleware).
import type { APIContext } from 'astro';
import { getDb } from '../../../db';
import { error, json, NO_STORE, serverError } from '../../../lib/http';
import { isHealthKey, listHealthIssue } from '../../../lib/repo/stats';

export async function GET({ url, locals }: APIContext) {
  const issue = url.searchParams.get('issue');
  if (!isHealthKey(issue)) return error(400, 'Indicador no válido');
  try {
    const articles = await listHealthIssue(getDb(locals), issue);
    return json({ success: true, issue, total: articles.length, articles }, { headers: NO_STORE });
  } catch (err) {
    return serverError('admin:health', err, 'No se pudo obtener la lista de artículos');
  }
}
