// src/lib/media.ts
// Utilidades de archivos multimedia compartidas por la API de medios y el mantenimiento.

// Tipos permitidos, identificados por la firma real del archivo (no por lo que declara el cliente).
export const IMAGE_TYPES: { type: string; ext: string; match: (b: Uint8Array) => boolean }[] = [
  { type: 'image/jpeg', ext: 'jpg', match: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: 'image/png', ext: 'png', match: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { type: 'image/gif', ext: 'gif', match: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  {
    type: 'image/webp',
    ext: 'webp',
    match: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP',
  },
  { type: 'image/avif', ext: 'avif', match: (b) => ascii(b, 4, 8) === 'ftyp' && /^avi[fs]$/.test(ascii(b, 8, 12)) },
];

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.subarray(start, end));
}

export function detectImageType(data: Uint8Array) {
  return IMAGE_TYPES.find((t) => t.match(data)) ?? null;
}

export function contentTypeFor(key: string) {
  const ext = key.split('.').pop()?.toLowerCase();
  const found = IMAGE_TYPES.find((t) => t.ext === ext || (ext === 'jpeg' && t.ext === 'jpg'));
  return found?.type ?? 'application/octet-stream';
}

export function generateKey(originalName: string, ext: string) {
  const base = originalName
    .replace(/\.[^.]*$/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20) || 'archivo';
  const random = crypto.randomUUID().slice(0, 6);
  return `${Date.now()}-${random}-${base}.${ext}`;
}
