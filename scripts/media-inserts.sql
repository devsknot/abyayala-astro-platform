-- Inserciones de medios en la base de datos


CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded TEXT NOT NULL
);

-- Limpiar tabla antes de insertar
DELETE FROM media;

INSERT INTO media (id, name, path, type, size, uploaded) VALUES (
  '2025-04-cafe-organico.jpg',
  'cafe-organico.jpg',
  '/2025/04/cafe-organico.jpg',
  'image/jpeg',
  29,
  '2025-04-14T00:31:52.961Z'
);
INSERT INTO media (id, name, path, type, size, uploaded) VALUES (
  '2025-04-cooperativa-reunion.jpg',
  'cooperativa-reunion.jpg',
  '/2025/04/cooperativa-reunion.jpg',
  'image/jpeg',
  71681,
  '2025-04-14T00:31:58.512Z'
);
INSERT INTO media (id, name, path, type, size, uploaded) VALUES (
  '2025-04-cultivo-organico.jpg',
  'cultivo-organico.jpg',
  '/2025/04/cultivo-organico.jpg',
  'image/jpeg',
  183754,
  '2025-04-14T00:32:03.115Z'
);
INSERT INTO media (id, name, path, type, size, uploaded) VALUES (
  '2025-04-feria-semillas.jpg',
  'feria-semillas.jpg',
  '/2025/04/feria-semillas.jpg',
  'image/jpeg',
  223957,
  '2025-04-14T00:32:07.864Z'
);
INSERT INTO media (id, name, path, type, size, uploaded) VALUES (
  '2025-04-riego-sostenible.jpg',
  'riego-sostenible.jpg',
  '/2025/04/riego-sostenible.jpg',
  'image/jpeg',
  144865,
  '2025-04-14T00:32:12.804Z'
);
INSERT INTO media (id, name, path, type, size, uploaded) VALUES (
  '2025-04-semillas-nativas.jpg',
  'semillas-nativas.jpg',
  '/2025/04/semillas-nativas.jpg',
  'image/jpeg',
  29,
  '2025-04-14T00:32:17.555Z'
);
