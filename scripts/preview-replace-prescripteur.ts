/* Script LECTURE SEULE : audit avant réassignation du prescripteur.
 *
 * But : "zouzou kouassi charles" n'est pas un prescripteur, on souhaite
 * réassigner toutes ses références FK (idUser sur les fiches médicales,
 * factures, prestations, etc.) vers "koffi aya juliette".
 *
 * Ce script ne modifie rien. Il :
 *  1. retrouve les deux utilisateurs (matching insensible à la casse / accents)
 *  2. compte par table le nombre de lignes pointant vers l'ancien user
 *
 * Usage : npx ts-node --transpile-only scripts/preview-replace-prescripteur.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ANCIEN_NOM = "zouzou kouassi charles";
const NOUVEAU_NOM = "koffi aya juliette";

const stripAccents = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

async function findUserByName(target: string) {
  const targetNorm = stripAccents(target);
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, prescripteur: true },
  });
  const matches = users.filter((u) => stripAccents(u.name) === targetNorm);
  return matches;
}

// Liste des tables et du nom du champ idUser à auditer.
// On regroupe par catégorie pour un affichage lisible.
const TABLES: Array<{
  group: string;
  model: string;
  field: string;
}> = [
  // --- Visites & paramétrage clinique ----------------------------------------
  { group: "Visites", model: "visite", field: "idUser" },
  { group: "Visites", model: "constante", field: "idUser" },
  { group: "Visites", model: "planning", field: "idUser" },
  { group: "Visites", model: "activite", field: "idUser" },
  // --- Fiches médicales ------------------------------------------------------
  { group: "Fiches", model: "gynecologie", field: "idUser" },
  { group: "Fiches", model: "traitementIva", field: "idUser" },
  { group: "Fiches", model: "ist", field: "istIdUser" },
  { group: "Fiches", model: "infertilite", field: "infertIdUser" },
  { group: "Fiches", model: "vbg", field: "vbgIdUser" },
  { group: "Fiches", model: "medecine", field: "mdgIdUser" },
  { group: "Fiches", model: "grossesse", field: "grossesseIdUser" },
  { group: "Fiches", model: "obstetrique", field: "obstIdUser" },
  { group: "Fiches", model: "accouchement", field: "accouchementIdUser" },
  { group: "Fiches", model: "cpon", field: "cponIdUser" },
  { group: "Fiches", model: "testGrossesse", field: "testIdUser" },
  { group: "Fiches", model: "saa", field: "saaIdUser" },
  { group: "Fiches", model: "depistageVih", field: "depistageVihIdUser" },
  { group: "Fiches", model: "pecVih", field: "pecVihIdUser" },
  { group: "Fiches", model: "examenPvVih", field: "examenPvVihIdUser" },
  // --- Références / ordonnances ----------------------------------------------
  { group: "Références", model: "reference", field: "idUser" },
  { group: "Références", model: "contreReference", field: "idUser" },
  { group: "Références", model: "ordonnance", field: "ordonnanceIdUser" },
  // --- Prestations / examens / écho (paramétrage + factures + résultats) -----
  { group: "Prestations", model: "prestation", field: "idUser" },
  { group: "Prestations", model: "tarifPrestation", field: "idUser" },
  { group: "Prestations", model: "facturePrestation", field: "idUser" },
  { group: "Examens", model: "examen", field: "idUser" },
  { group: "Examens", model: "tarifExamen", field: "idUser" },
  { group: "Examens", model: "demandeExamen", field: "idUser" },
  { group: "Examens", model: "resultatExamen", field: "idUser" },
  { group: "Examens", model: "factureExamen", field: "idUser" },
  { group: "Échographies", model: "echographie", field: "idUser" },
  { group: "Échographies", model: "tarifEchographie", field: "idUser" },
  { group: "Échographies", model: "demandeEchographie", field: "idUser" },
  { group: "Échographies", model: "resultatEchographie", field: "idUser" },
  { group: "Échographies", model: "factureEchographie", field: "idUser" },
  // --- Pharmacie -------------------------------------------------------------
  { group: "Pharmacie", model: "produit", field: "idUser" },
  { group: "Pharmacie", model: "tarifProduit", field: "idUser" },
  { group: "Pharmacie", model: "inventaire", field: "idUser" },
  { group: "Pharmacie", model: "detailInventaire", field: "idUser" },
  { group: "Pharmacie", model: "anomalieInventaire", field: "idUser" },
  { group: "Pharmacie", model: "factureProduit", field: "idUser" },
  { group: "Pharmacie", model: "venteDirecte", field: "idUser" },
  { group: "Pharmacie", model: "detailCommande", field: "idUser" },
  { group: "Pharmacie", model: "journalPharmacy", field: "idUser" },
];

async function countByModel(
  model: string,
  field: string,
  oldId: string,
): Promise<number> {
  // Accès dynamique au modèle Prisma typé as any (les noms sont vérifiés
  // par TypeScript via la liste TABLES, mais l'accès générique nécessite any).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delegate = (prisma as any)[model];
  if (!delegate || typeof delegate.count !== "function") {
    throw new Error(`Modèle Prisma introuvable : ${model}`);
  }
  return delegate.count({ where: { [field]: oldId } });
}

async function main() {
  console.log("\n=== AUDIT DE RÉASSIGNATION DE PRESCRIPTEUR (LECTURE SEULE) ===\n");

  const ancienUsers = await findUserByName(ANCIEN_NOM);
  const nouveauUsers = await findUserByName(NOUVEAU_NOM);

  console.log(`Recherche utilisateur ANCIEN : "${ANCIEN_NOM}"`);
  if (ancienUsers.length === 0) {
    console.log("  ❌ Aucun utilisateur trouvé avec ce nom.");
    return;
  }
  ancienUsers.forEach((u, i) =>
    console.log(
      `  ${i + 1}. id=${u.id} | email=${u.email} | prescripteur=${u.prescripteur}`,
    ),
  );

  console.log(`\nRecherche utilisateur NOUVEAU : "${NOUVEAU_NOM}"`);
  if (nouveauUsers.length === 0) {
    console.log("  ❌ Aucun utilisateur trouvé avec ce nom.");
    return;
  }
  nouveauUsers.forEach((u, i) =>
    console.log(
      `  ${i + 1}. id=${u.id} | email=${u.email} | prescripteur=${u.prescripteur}`,
    ),
  );

  if (ancienUsers.length > 1) {
    console.log(
      `\n⚠️  Plusieurs utilisateurs anciens. Le script d'exécution les regroupera tous.`,
    );
  }
  if (nouveauUsers.length > 1) {
    console.log(
      `\n❌  Plusieurs utilisateurs cibles "${NOUVEAU_NOM}" — il faut désambiguïser avant de continuer.`,
    );
    return;
  }

  const oldIds = ancienUsers.map((u) => u.id);
  const newId = nouveauUsers[0].id;

  console.log(`\nIDs à réassigner :  [${oldIds.join(", ")}]`);
  console.log(`ID cible        :  ${newId}`);

  console.log("\n--- Lignes par table à réassigner ---\n");

  let totalRows = 0;
  let lastGroup = "";
  for (const t of TABLES) {
    if (t.group !== lastGroup) {
      console.log(`\n[${t.group}]`);
      lastGroup = t.group;
    }
    let count = 0;
    for (const oldId of oldIds) {
      try {
        count += await countByModel(t.model, t.field, oldId);
      } catch (e) {
        console.log(
          `  ${t.model.padEnd(24)} ${t.field.padEnd(28)}  ⚠️  erreur : ${(e as Error).message}`,
        );
      }
    }
    if (count > 0) totalRows += count;
    const indicator = count > 0 ? "→" : " ";
    console.log(
      `  ${indicator} ${t.model.padEnd(24)} ${t.field.padEnd(28)} ${String(count).padStart(6)}`,
    );
  }

  console.log(`\n=== TOTAL DE LIGNES À RÉASSIGNER : ${totalRows} ===\n`);

  console.log(
    "Si ce total vous convient, lancez le script execute-replace-prescripteur.ts pour appliquer la mise à jour (transaction).",
  );
}

main()
  .catch((e) => {
    console.error("Erreur :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
