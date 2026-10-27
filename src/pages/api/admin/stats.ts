// src/pages/api/admin/stats.ts
// GET /api/admin/stats → métricas del dashboard (requiere sesión: todo /api/admin/* está protegido).
import type { APIContext } from 'astro';
import { getDb } from '../../../db';
import { json, NO_STORE, serverError } from '../../../lib/http';
import { getContentStats, getMediaStats } from '../../../lib/repo/stats';

export async function GET({ locals }: APIContext) {
  try {
    const bucket = locals.runtime?.env?.R2_BUCKET;
    const [content, media] = await Promise.all([
      getContentStats(getDb(locals)),
      bucket ? getMediaStats(bucket) : Promise.resolve({ count: 0, bytes: 0, truncated: false }),
    ]);
    return json(
      {
        success: true,
        generatedAt: new Date().toISOString(),
        ...content,
        totals: { ...content.totals, media },
      },
      { headers: NO_STORE },
    );
  } catch (err) {
    return serverError('admin:stats', err, 'No se pudieron calcular las estadísticas');
  }
}
