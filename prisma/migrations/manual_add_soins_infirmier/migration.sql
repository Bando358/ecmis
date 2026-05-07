-- ============================================================================
-- Migration manuelle : ajout du modèle SoinsInfirmier
-- ----------------------------------------------------------------------------
-- Toutes les opérations sont ADDITIVES (CREATE, ADD VALUE) — aucune donnée
-- existante n'est modifiée ou supprimée. Sûr à exécuter sur la base Neon
-- de production.
-- ============================================================================

-- 1. Étendre l'enum TableName avec la nouvelle valeur SOINS_INFIRMIER
--    (si elle n'existe pas déjà — IF NOT EXISTS est supporté depuis PG 9.6)
ALTER TYPE "TableName" ADD VALUE IF NOT EXISTS 'SOINS_INFIRMIER';

-- 2. Créer la table SoinsInfirmier
CREATE TABLE IF NOT EXISTS "SoinsInfirmier" (
    "id"           TEXT        NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    "typeSoin"     TEXT        NOT NULL,
    "observations" TEXT,
    "idVisite"     TEXT        NOT NULL,
    "idClient"     TEXT        NOT NULL,
    "idClinique"   TEXT        NOT NULL,
    "idUser"       TEXT        NOT NULL,

    CONSTRAINT "SoinsInfirmier_pkey" PRIMARY KEY ("id")
);

-- 3. Index pour les recherches par visite / client / clinique
CREATE INDEX IF NOT EXISTS "SoinsInfirmier_idVisite_idx"   ON "SoinsInfirmier"("idVisite");
CREATE INDEX IF NOT EXISTS "SoinsInfirmier_idClient_idx"   ON "SoinsInfirmier"("idClient");
CREATE INDEX IF NOT EXISTS "SoinsInfirmier_idClinique_idx" ON "SoinsInfirmier"("idClinique");

-- 4. Foreign keys (alignées avec la sémantique du schema.prisma)
ALTER TABLE "SoinsInfirmier"
  ADD CONSTRAINT "SoinsInfirmier_idVisite_fkey"
  FOREIGN KEY ("idVisite") REFERENCES "Visite"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SoinsInfirmier"
  ADD CONSTRAINT "SoinsInfirmier_idClient_fkey"
  FOREIGN KEY ("idClient") REFERENCES "Client"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SoinsInfirmier"
  ADD CONSTRAINT "SoinsInfirmier_idClinique_fkey"
  FOREIGN KEY ("idClinique") REFERENCES "Clinique"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ⚠ Le modèle Prisma `User` est mappé vers la table SQL `user` via @@map("user")
ALTER TABLE "SoinsInfirmier"
  ADD CONSTRAINT "SoinsInfirmier_idUser_fkey"
  FOREIGN KEY ("idUser") REFERENCES "user"("id")
  ON DELETE NO ACTION ON UPDATE CASCADE;
