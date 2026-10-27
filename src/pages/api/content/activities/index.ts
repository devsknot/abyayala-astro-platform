// src/pages/api/content/activities/index.ts
// GET  /api/content/activities?limit=&offset=&entity_type=&type=  → array de actividades (requiere sesión)
// POST /api/content/activities                                    → registrar actividad (requiere sesión)
import type { APIContext } from 'astro';
import { getDb } from '../../../../db';
import { clampInt, error, json, NO_STORE, readJson, serverError } from '../../../../lib/http';
import { listActivities, logActivity, type ActivityInput } from '../../../../lib/repo/activities';

export async function GET({ url, locals }: APIContext) {
  try {
    const activities = await listActivities(getDb(locals), {
      limit: clampInt(url.searchParams.get('limit'), 20, 1, 100),
      offset: clampInt(url.searchParams.get('offset'), 0, 0, 100_000),
      entityType: url.searchParams.get('entity_type'),
      type: url.searchParams.get('type'),
    });
    return json(activities, { headers: NO_STORE });
  } catch (err) {
    return serverError('activities:GET', err, 'No se pudieron obtener las actividades');
  }
}

export async function POST({ request, locals }: APIContext) {
  const data = await readJson<ActivityInput>(request);
  if (!data?.type || !data.entity_type) return error(400, 'type y entity_type son obligatorios');
  const id = await logActivity(getDb(locals), locals.user, data);
  if (id == null) return error(500, 'No se pudo registrar la actividad');
  return json({ success: true, message: 'Actividad registrada', id }, { status: 201, headers: NO_STORE });
}
