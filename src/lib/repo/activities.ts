// src/lib/repo/activities.ts
// Registro de acciones del panel. El usuario se toma del JWT de Access, nunca del cliente.
import { and, desc, eq, type SQL } from 'drizzle-orm';
import type { Database } from '../../db';
import { activities } from '../../db/schema';
import type { AccessUser } from '../auth';

export interface ActivityInput {
  type: string;
  entity_type: string;
  entity_id?: string | number | null;
  entity_title?: string | null;
  details?: unknown;
}

export async function logActivity(db: Database, user: AccessUser | null | undefined, input: ActivityInput) {
  try {
    const [row] = await db
      .insert(activities)
      .values({
        type: input.type.slice(0, 50),
        entityType: input.entity_type.slice(0, 50),
        entityId: input.entity_id != null ? String(input.entity_id).slice(0, 200) : null,
        entityTitle: (input.entity_title ?? '').slice(0, 300),
        userId: user?.email ?? null,
        userName: user?.name ?? 'Sistema',
        details: input.details == null ? null : JSON.stringify(input.details).slice(0, 5000),
      })
      .returning({ id: activities.id });
    return row.id;
  } catch (err) {
    // Que falle el registro de actividad no debe romper la operación principal.
    console.error('[activities] No se pudo registrar la actividad', err);
    return null;
  }
}

export function relativeTime(dateString: string | null): string {
  if (!dateString) return 'Fecha desconocida';
  // CURRENT_TIMESTAMP de SQLite viene en UTC sin zona: 'YYYY-MM-DD HH:MM:SS'
  const date = new Date(/Z|[+-]\d\d:?\d\d$/.test(dateString) ? dateString : `${dateString.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return 'Fecha inválida';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const units: [string, string, number][] = [
    ['año', 'años', 31536000],
    ['mes', 'meses', 2592000],
    ['semana', 'semanas', 604800],
    ['día', 'días', 86400],
    ['hora', 'horas', 3600],
    ['minuto', 'minutos', 60],
  ];
  for (const [singular, plural, size] of units) {
    const n = Math.floor(seconds / size);
    if (n >= 1) return `Hace ${n} ${n > 1 ? plural : singular}`;
  }
  return 'Hace un momento';
}

export async function listActivities(
  db: Database,
  { limit, offset, entityType, type }: { limit: number; offset: number; entityType?: string | null; type?: string | null },
) {
  const conditions: SQL[] = [];
  if (entityType) conditions.push(eq(activities.entityType, entityType));
  if (type) conditions.push(eq(activities.type, type));
  const rows = await db
    .select()
    .from(activities)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(activities.createdAt), desc(activities.id))
    .limit(limit)
    .offset(offset);
  return rows.map((a) => {
    let details: unknown = a.details;
    if (a.details) {
      try {
        details = JSON.parse(a.details);
      } catch {
        /* se deja como texto */
      }
    }
    return {
      id: a.id,
      type: a.type,
      entity_type: a.entityType,
      entity_id: a.entityId,
      entity_title: a.entityTitle,
      user_name: a.userName,
      details,
      created_at: a.createdAt,
      relative_time: relativeTime(a.createdAt),
    };
  });
}
