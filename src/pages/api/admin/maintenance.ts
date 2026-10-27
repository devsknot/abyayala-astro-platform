// src/pages/api/admin/maintenance.ts
// POST /api/admin/maintenance { action, apply?, authorId? } → reparaciones de datos del dashboard.
// Sin `apply: true` solo devuelve la vista previa. Requiere sesión (todo /api/admin/* está protegido).
import type { APIContext } from 'astro';
import { getDb } from '../../../db';
import { error, json, NO_STORE, readJson, serverError } from '../../../lib/http';
import { logActivity } from '../../../lib/repo/activities';
import { MAINTENANCE_ACTIONS, MaintenanceError, runMaintenance, type MaintenanceAction } from '../../../lib/repo/maintenance';

const LABELS: Record<MaintenanceAction, string> = {
  images: 'Imágenes destacadas',
  descriptions: 'Descripciones',
  authors: 'Autores',
  base64: 'Imágenes incrustadas',
};

export async function POST({ request, locals }: APIContext) {
  const body = await readJson<{ action?: string; apply?: boolean; authorId?: number }>(request);
  const action = body?.action as MaintenanceAction;
  if (!MAINTENANCE_ACTIONS.includes(action)) return error(400, 'Acción de mantenimiento no válida');

  const apply = body?.apply === true;
  const authorId = Number.isInteger(body?.authorId) ? Number(body?.authorId) : null;

  try {
    const db = getDb(locals);
    const result = await runMaintenance(db, locals.runtime?.env?.R2_BUCKET, {
      action,
      apply,
      authorId,
      user: locals.user?.email,
    });
    if (apply && result.affected > 0) {
      await logActivity(db, locals.user, {
        type: 'maintenance',
        entity_type: 'article',
        entity_title: LABELS[action],
        details: { action, affected: result.affected, summary: result.summary },
      });
    }
    return json({ success: true, ...result }, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof MaintenanceError) return error(400, err.message);
    return serverError('admin:maintenance', err, 'No se pudo completar la reparación');
  }
}
