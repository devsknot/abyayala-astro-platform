// src/pages/api/media/[...slug].ts
// GET    /api/media/list?cursor=   → listado del bucket R2 (requiere sesión, ver middleware)
// GET    /api/media/:key           → descarga pública del archivo
// POST   /api/media/upload         → subida multipart (campo `file`), solo imágenes ≤ 10 MB (requiere sesión)
// DELETE /api/media/:key           → borrar archivo (requiere sesión)
import type { APIContext } from 'astro';
import type { R2Object } from '@cloudflare/workers-types';
import { getDb } from '../../../db';
import { error, json, NO_STORE, serverError, slugParam } from '../../../lib/http';
import { contentTypeFor, detectImageType, generateKey, IMAGE_TYPES } from '../../../lib/media';
import { logActivity } from '../../../lib/repo/activities';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function bucket(locals: App.Locals) {
  const r2 = locals.runtime?.env?.R2_BUCKET;
  if (!r2) throw new Error('El binding R2_BUCKET no está configurado');
  return r2;
}

export async function GET({ params, url, locals }: APIContext) {
  const key = slugParam(params.slug);
  try {
    const r2 = bucket(locals);

    if (!key || key === 'list') {
      const listed = await r2.list({ limit: 1000, cursor: url.searchParams.get('cursor') || undefined });
      const files = listed.objects.map((o: R2Object) => ({
        id: o.key,
        name: o.key.split('/').pop() || o.key,
        path: `/${o.key}`,
        url: `/api/media/${o.key}`,
        size: o.size,
        type: o.httpMetadata?.contentType || contentTypeFor(o.key),
        uploaded: o.uploaded.toISOString(),
      }));
      return json(
        { success: true, files, truncated: listed.truncated, cursor: listed.truncated ? listed.cursor : undefined },
        { headers: NO_STORE },
      );
    }

    const object = await r2.get(key);
    if (!object) return error(404, 'Archivo no encontrado');
    const headers = new Headers();
    // Los tipos de workers-types y los del DOM no coinciden; en tiempo de ejecución son los mismos.
    object.writeHttpMetadata(headers as unknown as Parameters<typeof object.writeHttpMetadata>[0]);
    // Nunca se sirve como HTML/SVG ejecutable aunque el objeto lo declare.
    const type = headers.get('Content-Type') || '';
    if (!IMAGE_TYPES.some((t) => t.type === type)) headers.set('Content-Type', contentTypeFor(key));
    headers.set('ETag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return new Response(object.body as unknown as BodyInit, { headers });
  } catch (err) {
    return serverError('media:GET', err, 'No se pudo obtener el archivo');
  }
}

export async function POST({ params, request, locals }: APIContext) {
  if (slugParam(params.slug) !== 'upload') return error(404, 'Ruta no encontrada');

  const length = Number(request.headers.get('Content-Length') || 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) return error(413, 'El archivo supera el máximo de 10 MB');

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error(400, 'Se esperaba un formulario multipart con el campo "file"');
  }
  const file = form.get('file');
  if (!file || typeof file === 'string') return error(400, 'No se recibió ningún archivo');
  if (file.size > MAX_UPLOAD_BYTES) return error(413, 'El archivo supera el máximo de 10 MB');

  const data = new Uint8Array(await file.arrayBuffer());
  const kind = detectImageType(data);
  if (!kind) return error(415, 'Tipo de archivo no permitido. Solo JPG, PNG, GIF, WebP o AVIF');

  const originalName = String(form.get('fileName') || file.name || 'archivo');
  try {
    const key = generateKey(originalName, kind.ext);
    const stored = await bucket(locals).put(key, data, {
      httpMetadata: { contentType: kind.type, cacheControl: 'public, max-age=31536000, immutable' },
      customMetadata: { originalName: originalName.slice(0, 200), uploadedBy: locals.user?.email ?? '' },
    });
    await logActivity(getDb(locals), locals.user, {
      type: 'media_upload',
      entity_type: 'media',
      entity_id: key,
      entity_title: originalName,
    });
    return json(
      {
        success: true,
        id: stored.key,
        name: originalName,
        url: `/api/media/${stored.key}`,
        size: stored.size,
        type: kind.type,
        uploaded: stored.uploaded.toISOString(),
      },
      { headers: NO_STORE },
    );
  } catch (err) {
    return serverError('media:POST', err, 'No se pudo subir el archivo');
  }
}

export async function DELETE({ params, locals }: APIContext) {
  const key = slugParam(params.slug);
  if (!key || key === 'list' || key === 'upload') return error(404, 'Ruta no encontrada');
  try {
    const r2 = bucket(locals);
    if (!(await r2.head(key))) return error(404, 'Archivo no encontrado');
    await r2.delete(key);
    await logActivity(getDb(locals), locals.user, { type: 'media_delete', entity_type: 'media', entity_id: key, entity_title: key });
    return json({ success: true, message: `Archivo ${key} eliminado` }, { headers: NO_STORE });
  } catch (err) {
    return serverError('media:DELETE', err, 'No se pudo eliminar el archivo');
  }
}
