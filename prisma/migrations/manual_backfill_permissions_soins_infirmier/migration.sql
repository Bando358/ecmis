-- ============================================================================
-- Backfill : créer une ligne Permission(SOINS_INFIRMIER) pour chaque user
-- qui n'en a pas encore. Idempotent — relancer ne crée jamais de doublon.
-- Toutes les actions sont à FALSE par défaut, c'est l'admin qui les
-- attribuera ensuite via la page fiche-permissions.
-- ============================================================================

INSERT INTO "permissions" (
  id,
  "createdAt",
  "updatedAt",
  "table",
  "canCreate",
  "canRead",
  "canUpdate",
  "canDelete",
  "userId"
)
SELECT
  gen_random_uuid()::text,
  NOW(),
  NOW(),
  'SOINS_INFIRMIER'::"TableName",
  false,
  false,
  false,
  false,
  u.id
FROM "user" u
WHERE NOT EXISTS (
  SELECT 1 FROM "permissions" p
  WHERE p."userId" = u.id
    AND p."table" = 'SOINS_INFIRMIER'
);
