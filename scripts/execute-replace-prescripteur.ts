/* Script d'EXÉCUTION : réassigne toutes les FK idUser de "zouzou kouassi
 * charles" vers "koffi aya juliette".
 *
 * Sécurités intégrées :
 *  1. Pré-vol : revérifie que les deux users existent et qu'il n'y a qu'un
 *     seul user cible.
 *  2. Audit log : avant de modifier, dump JSON complet (model, id de la
 *     ligne, ancien idUser) dans scripts/logs/replace-prescripteur-<ts>.json
 *     pour permettre un revert ciblé si jamais.
 *  3. Transaction Prisma : toutes les UPDATE sont dans un seul $transaction.
 *     Une erreur sur n'importe quelle table → rollback complet, état initial
 *     préservé.
 *  4. Idempotent : réexécutable, les UPDATE matcheront 0 ligne après coup.
 *  5. Vérification post-update : recompte les lignes pointant vers l'ancien
 *     user (doit être 0).
 *
 * Usage : npx tsx scripts/execute-replace-prescripteur.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const ANCIEN_NOM = "zouzou kouassi charles";
const NOUVEAU_NOM = "koffi aya juliette";

const stripAccents = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

// Mêmes tables/champs que le script de preview.
const TABLES: Array<{ model: string; field: string }> = [
  { model: "visite", field: "idUser" },
  { model: "constante", field: "idUser" },
  { model: "planning", field: "idUser" },
  { model: "activite", field: "idUser" },
  { model: "gynecologie", field: "idUser" },
  { model: "traitementIva", field: "idUser" },
  { model: "ist", field: "istIdUser" },
  { model: "infertilite", field: "infertIdUser" },
  { model: "vbg", field: "vbgIdUser" },
  { model: "medecine", field: "mdgIdUser" },
  { model: "grossesse", field: "grossesseIdUser" },
  { model: "obstetrique", field: "obstIdUser" },
  { model: "accouchement", field: "accouchementIdUser" },
  { model: "cpon", field: "cponIdUser" },
  { model: "testGrossesse", field: "testIdUser" },
  { model: "saa", field: "saaIdUser" },
  { model: "depistageVih", field: "depistageVihIdUser" },
  { model: "pecVih", field: "pecVihIdUser" },
  { model: "examenPvVih", field: "examenPvVihIdUser" },
  { model: "reference", field: "idUser" },
  { model: "contreReference", field: "idUser" },
  { model: "ordonnance", field: "ordonnanceIdUser" },
  { model: "prestation", field: "idUser" },
  { model: "tarifPrestation", field: "idUser" },
  { model: "facturePrestation", field: "idUser" },
  { model: "examen", field: "idUser" },
  { model: "tarifExamen", field: "idUser" },
  { model: "demandeExamen", field: "idUser" },
  { model: "resultatExamen", field: "idUser" },
  { model: "factureExamen", field: "idUser" },
  { model: "echographie", field: "idUser" },
  { model: "tarifEchographie", field: "idUser" },
  { model: "demandeEchographie", field: "idUser" },
  { model: "resultatEchographie", field: "idUser" },
  { model: "factureEchographie", field: "idUser" },
  { model: "produit", field: "idUser" },
  { model: "tarifProduit", field: "idUser" },
  { model: "inventaire", field: "idUser" },
  { model: "detailInventaire", field: "idUser" },
  { model: "anomalieInventaire", field: "idUser" },
  { model: "factureProduit", field: "idUser" },
  { model: "venteDirecte", field: "idUser" },
  { model: "detailCommande", field: "idUser" },
  { model: "journalPharmacy", field: "idUser" },
];

async function findUserByName(target: string) {
  const targetNorm = stripAccents(target);
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, prescripteur: true },
  });
  return users.filter((u) => stripAccents(u.name) === targetNorm);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const delegateOf = (model: string): any => (prisma as any)[model];

async function main() {
  console.log("\n=== EXÉCUTION : RÉASSIGNATION DE PRESCRIPTEUR ===\n");

  // -- 1. Pré-vol -------------------------------------------------------------
  const ancienUsers = await findUserByName(ANCIEN_NOM);
  const nouveauUsers = await findUserByName(NOUVEAU_NOM);

  if (ancienUsers.length === 0) {
    console.log(`❌ Utilisateur ANCIEN introuvable : "${ANCIEN_NOM}". Abort.`);
    return;
  }
  if (nouveauUsers.length === 0) {
    console.log(`❌ Utilisateur NOUVEAU introuvable : "${NOUVEAU_NOM}". Abort.`);
    return;
  }
  if (nouveauUsers.length > 1) {
    console.log(
      `❌ Plusieurs utilisateurs cibles "${NOUVEAU_NOM}" — ambigu. Abort.`,
    );
    return;
  }

  const oldIds = ancienUsers.map((u) => u.id);
  const newId = nouveauUsers[0].id;

  console.log(`Anciens id  : [${oldIds.join(", ")}]`);
  console.log(`Nouvel  id  : ${newId}\n`);

  // -- 2. Audit log : capturer tout ce qui sera modifié ----------------------
  console.log("Capture de l'audit log avant modification...");
  type AuditEntry = { model: string; field: string; recordId: string; oldUserId: string };
  const audit: AuditEntry[] = [];
  for (const t of TABLES) {
    const delegate = delegateOf(t.model);
    if (!delegate) continue;
    for (const oldId of oldIds) {
      const rows = await delegate.findMany({
        where: { [t.field]: oldId },
        select: { id: true, [t.field]: true },
      });
      rows.forEach((r: { id: string }) => {
        audit.push({
          model: t.model,
          field: t.field,
          recordId: r.id,
          oldUserId: oldId,
        });
      });
    }
  }

  const logsDir = path.join(__dirname, "logs");
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const logFile = path.join(logsDir, `replace-prescripteur-${ts}.json`);
  fs.writeFileSync(
    logFile,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        ancien: { name: ANCIEN_NOM, ids: oldIds },
        nouveau: { name: NOUVEAU_NOM, id: newId },
        totalEntries: audit.length,
        entries: audit,
      },
      null,
      2,
    ),
  );
  console.log(`✓ Audit log écrit : ${logFile}`);
  console.log(`  Total : ${audit.length} lignes seront modifiées.\n`);

  if (audit.length === 0) {
    console.log("Aucune ligne à modifier — rien à faire.");
    return;
  }

  // -- 3. Transaction d'UPDATE -----------------------------------------------
  console.log("Préparation de la transaction Prisma...");
  const updates = TABLES.flatMap((t) =>
    oldIds.map((oldId) =>
      delegateOf(t.model).updateMany({
        where: { [t.field]: oldId },
        data: { [t.field]: newId },
      }),
    ),
  );

  console.log(`Exécution de ${updates.length} UPDATE en transaction...`);
  const results = await prisma.$transaction(updates);

  // Rapport ligne par ligne
  console.log("\n--- Rapport d'exécution (lignes modifiées par table) ---\n");
  let total = 0;
  let i = 0;
  for (const t of TABLES) {
    let count = 0;
    for (const _ of oldIds) {
      const r = results[i++] as { count: number };
      count += r.count;
    }
    if (count > 0) {
      total += count;
      console.log(`  ✓ ${t.model.padEnd(24)} ${t.field.padEnd(28)} ${String(count).padStart(6)}`);
    }
  }
  console.log(`\n=== TOTAL MODIFIÉ : ${total} lignes ===\n`);

  // -- 4. Vérification post-update ------------------------------------------
  console.log("Vérification post-update (lignes restantes pointant vers l'ancien user)...");
  let residuel = 0;
  for (const t of TABLES) {
    const delegate = delegateOf(t.model);
    for (const oldId of oldIds) {
      const c = await delegate.count({ where: { [t.field]: oldId } });
      residuel += c;
      if (c > 0) {
        console.log(`  ⚠️  ${t.model}.${t.field} contient encore ${c} ligne(s) pointant vers ${oldId}`);
      }
    }
  }
  if (residuel === 0) {
    console.log("✓ Aucune ligne résiduelle — réassignation complète.\n");
  } else {
    console.log(`\n❌ ${residuel} lignes résiduelles détectées. Vérifiez le log.`);
  }
}

main()
  .catch((e) => {
    console.error("\n❌ ERREUR — la transaction a été annulée (rollback automatique) :");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
