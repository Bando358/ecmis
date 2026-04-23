/* Script destructif : fusionne les visites en doublon d'un client pour une date
 * Usage: npx tsx scripts/execute-merge-visite.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CLIENT_CODE = "DA/CA01/2026/04/01716-KOU";
const DATE_CIBLE = "2026-04-08";

async function main() {
  const client = await prisma.client.findFirst({
    where: { code: CLIENT_CODE },
    select: { id: true, code: true, nom: true, prenom: true },
  });

  if (!client) {
    console.log(`❌ Client introuvable: ${CLIENT_CODE}`);
    return;
  }

  const dateStart = new Date(`${DATE_CIBLE}T00:00:00.000Z`);
  const dateEnd = new Date(`${DATE_CIBLE}T23:59:59.999Z`);

  const visites = await prisma.visite.findMany({
    where: {
      idClient: client.id,
      dateVisite: { gte: dateStart, lte: dateEnd },
    },
    orderBy: { createdAt: "asc" },
  });

  if (visites.length < 2) {
    console.log(
      `ℹ️  Pas de doublon à fusionner pour ${CLIENT_CODE} le ${DATE_CIBLE}.`,
    );
    return;
  }

  const target = visites[0];
  const sources = visites.slice(1);
  const sourceIds = sources.map((s) => s.id);

  console.log(
    `👤 Client: ${client.nom} ${client.prenom} (${client.code}, ${client.id})`,
  );
  console.log(`🟢 Cible (gardée): ${target.id} [${target.motifVisite}]`);
  console.log(
    `🔴 Source(s) à fusionner: ${sourceIds.join(", ")} [${sources
      .map((s) => s.motifVisite)
      .join(", ")}]`,
  );

  const report: Record<string, number> = {};

  await prisma.$transaction(
    async (tx) => {
      // 1) RecapVisite (idVisite @unique): fusion des listes
      const targetRecap = await tx.recapVisite.findUnique({
        where: { idVisite: target.id },
      });
      const sourceRecaps = await tx.recapVisite.findMany({
        where: { idVisite: { in: sourceIds } },
      });

      if (sourceRecaps.length > 0) {
        const mergedFormulaires = new Set<string>(
          targetRecap?.formulaires || [],
        );
        const mergedPrescripteurs = new Set<string>(
          targetRecap?.prescripteurs || [],
        );
        sourceRecaps.forEach((r) => {
          (r.formulaires || []).forEach((f) => mergedFormulaires.add(f));
          (r.prescripteurs || []).forEach((p) => mergedPrescripteurs.add(p));
        });

        if (targetRecap) {
          await tx.recapVisite.update({
            where: { idVisite: target.id },
            data: {
              formulaires: Array.from(mergedFormulaires),
              prescripteurs: Array.from(mergedPrescripteurs),
            },
          });
          await tx.recapVisite.deleteMany({
            where: { idVisite: { in: sourceIds } },
          });
          report["recapVisite"] = sourceRecaps.length;
        } else {
          const [first, ...rest] = sourceRecaps;
          await tx.recapVisite.update({
            where: { id: first.id },
            data: {
              idVisite: target.id,
              formulaires: Array.from(mergedFormulaires),
              prescripteurs: Array.from(mergedPrescripteurs),
            },
          });
          if (rest.length > 0) {
            await tx.recapVisite.deleteMany({
              where: { id: { in: rest.map((r) => r.id) } },
            });
          }
          report["recapVisite"] = sourceRecaps.length;
        }
      }

      // 2) Tables liées : updateMany
      const updates: { name: string; res: Promise<{ count: number }> }[] = [
        { name: "constante", res: tx.constante.updateMany({ where: { idVisite: { in: sourceIds } }, data: { idVisite: target.id } }) },
        { name: "planning", res: tx.planning.updateMany({ where: { idVisite: { in: sourceIds } }, data: { idVisite: target.id } }) },
        { name: "gynecologie", res: tx.gynecologie.updateMany({ where: { idVisite: { in: sourceIds } }, data: { idVisite: target.id } }) },
        { name: "ist", res: tx.ist.updateMany({ where: { istIdVisite: { in: sourceIds } }, data: { istIdVisite: target.id } }) },
        { name: "infertilite", res: tx.infertilite.updateMany({ where: { infertIdVisite: { in: sourceIds } }, data: { infertIdVisite: target.id } }) },
        { name: "vbg", res: tx.vbg.updateMany({ where: { vbgIdVisite: { in: sourceIds } }, data: { vbgIdVisite: target.id } }) },
        { name: "medecine", res: tx.medecine.updateMany({ where: { mdgIdVisite: { in: sourceIds } }, data: { mdgIdVisite: target.id } }) },
        { name: "grossesse", res: tx.grossesse.updateMany({ where: { grossesseIdVisite: { in: sourceIds } }, data: { grossesseIdVisite: target.id } }) },
        { name: "obstetrique", res: tx.obstetrique.updateMany({ where: { obstIdVisite: { in: sourceIds } }, data: { obstIdVisite: target.id } }) },
        { name: "accouchement", res: tx.accouchement.updateMany({ where: { accouchementIdVisite: { in: sourceIds } }, data: { accouchementIdVisite: target.id } }) },
        { name: "cpon", res: tx.cpon.updateMany({ where: { cponIdVisite: { in: sourceIds } }, data: { cponIdVisite: target.id } }) },
        { name: "testGrossesse", res: tx.testGrossesse.updateMany({ where: { testIdVisite: { in: sourceIds } }, data: { testIdVisite: target.id } }) },
        { name: "saa", res: tx.saa.updateMany({ where: { saaIdVisite: { in: sourceIds } }, data: { saaIdVisite: target.id } }) },
        { name: "depistageVih", res: tx.depistageVih.updateMany({ where: { depistageVihIdVisite: { in: sourceIds } }, data: { depistageVihIdVisite: target.id } }) },
        { name: "pecVih", res: tx.pecVih.updateMany({ where: { pecVihIdVisite: { in: sourceIds } }, data: { pecVihIdVisite: target.id } }) },
        { name: "examenPvVih", res: tx.examenPvVih.updateMany({ where: { examenPvVihIdVisite: { in: sourceIds } }, data: { examenPvVihIdVisite: target.id } }) },
        { name: "reference", res: tx.reference.updateMany({ where: { refIdVisite: { in: sourceIds } }, data: { refIdVisite: target.id } }) },
        { name: "contreReference", res: tx.contreReference.updateMany({ where: { refIdVisite: { in: sourceIds } }, data: { refIdVisite: target.id } }) },
        { name: "ordonnance", res: tx.ordonnance.updateMany({ where: { ordonnanceIdVisite: { in: sourceIds } }, data: { ordonnanceIdVisite: target.id } }) },
        { name: "couverture", res: tx.couverture.updateMany({ where: { couvertIdVisite: { in: sourceIds } }, data: { couvertIdVisite: target.id } }) },
        { name: "bilan", res: tx.bilan.updateMany({ where: { bilanIdVisite: { in: sourceIds } }, data: { bilanIdVisite: target.id } }) },
        { name: "facturePrestation", res: tx.facturePrestation.updateMany({ where: { idVisite: { in: sourceIds } }, data: { idVisite: target.id } }) },
        { name: "factureProduit", res: tx.factureProduit.updateMany({ where: { idVisite: { in: sourceIds } }, data: { idVisite: target.id } }) },
        { name: "factureExamen", res: tx.factureExamen.updateMany({ where: { idVisite: { in: sourceIds } }, data: { idVisite: target.id } }) },
        { name: "demandeExamen", res: tx.demandeExamen.updateMany({ where: { idVisite: { in: sourceIds } }, data: { idVisite: target.id } }) },
        { name: "resultatExamen", res: tx.resultatExamen.updateMany({ where: { idVisite: { in: sourceIds } }, data: { idVisite: target.id } }) },
        { name: "factureEchographie", res: tx.factureEchographie.updateMany({ where: { idVisite: { in: sourceIds } }, data: { idVisite: target.id } }) },
        { name: "demandeEchographie", res: tx.demandeEchographie.updateMany({ where: { idVisite: { in: sourceIds } }, data: { idVisite: target.id } }) },
        { name: "resultatEchographie", res: tx.resultatEchographie.updateMany({ where: { idVisite: { in: sourceIds } }, data: { idVisite: target.id } }) },
        { name: "commissionExamen", res: tx.commissionExamen.updateMany({ where: { idVisite: { in: sourceIds } }, data: { idVisite: target.id } }) },
        { name: "commissionEchographie", res: tx.commissionEchographie.updateMany({ where: { idVisite: { in: sourceIds } }, data: { idVisite: target.id } }) },
        { name: "gestionVisite", res: tx.gestionVisite.updateMany({ where: { idVisite: { in: sourceIds } }, data: { idVisite: target.id } }) },
      ];

      const results = await Promise.all(updates.map((u) => u.res));
      updates.forEach((u, i) => {
        if (results[i].count > 0) report[u.name] = results[i].count;
      });

      // 3) Enrichir la cible: si elle n'a pas idActivite/idLieu, reprendre ceux d'une source
      const sourceAvecActivite = sources.find((s) => s.idActivite || s.idLieu);
      if (
        sourceAvecActivite &&
        !target.idActivite &&
        !target.idLieu &&
        (sourceAvecActivite.idActivite || sourceAvecActivite.idLieu)
      ) {
        await tx.visite.update({
          where: { id: target.id },
          data: {
            idActivite: sourceAvecActivite.idActivite ?? null,
            idLieu: sourceAvecActivite.idLieu ?? null,
          },
        });
        report["visite.activite_recuperee"] = 1;
      }

      // 4) Supprimer les visites sources
      await tx.visite.deleteMany({ where: { id: { in: sourceIds } } });
      report["visite_supprimees"] = sourceIds.length;
    },
    { timeout: 30000 },
  );

  console.log("\n✅ Fusion effectuée. Rapport :");
  Object.entries(report).forEach(([k, n]) => {
    console.log(`  - ${k}: ${n}`);
  });
}

main()
  .catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
