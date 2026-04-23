/* Script lecture seule : montre les visites en doublon pour un client donné
 * Usage: npx ts-node --transpile-only scripts/preview-merge-visite.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CLIENT_CODE = "DA/CA01/2026/04/01716-KOU";
const DATE_CIBLE = "2026-04-08"; // 08/04/2026

async function main() {
  const client = await prisma.client.findFirst({
    where: { code: CLIENT_CODE },
    select: {
      id: true,
      code: true,
      nom: true,
      prenom: true,
      dateNaissance: true,
      idClinique: true,
    },
  });

  if (!client) {
    console.log(`❌ Client introuvable: ${CLIENT_CODE}`);
    return;
  }

  console.log(`\n👤 Client: ${client.nom} ${client.prenom} (${client.code})`);
  console.log(`   id: ${client.id}`);

  const dateStart = new Date(`${DATE_CIBLE}T00:00:00.000Z`);
  const dateEnd = new Date(`${DATE_CIBLE}T23:59:59.999Z`);

  const visites = await prisma.visite.findMany({
    where: {
      idClient: client.id,
      dateVisite: { gte: dateStart, lte: dateEnd },
    },
    orderBy: { createdAt: "asc" },
    include: {
      RecapVisite: true,
      _count: {
        select: {
          Constante: true,
          Planning: true,
          Gynecologie: true,
          Ist: true,
          Infertilite: true,
          Vbg: true,
          Medecine: true,
          Grossesse: true,
          Obstetrique: true,
          Accouchement: true,
          Cpon: true,
          TestGrossesse: true,
          Saa: true,
          DepistageVih: true,
          PecVih: true,
          ExamenPvVih: true,
          Reference: true,
          ContreReference: true,
          Ordonnance: true,
          Couverture: true,
          Bilan: true,
          FacturePrestation: true,
          FactureProduit: true,
          FactureExamen: true,
          DemandeExamen: true,
          ResultatExamen: true,
          FactureEchographie: true,
          DemandeEchographie: true,
          resultatEchographie: true,
          CommissionExamen: true,
          CommissionEchographie: true,
          gestionVisites: true,
        },
      },
    },
  });

  console.log(
    `\n🗓  ${visites.length} visite(s) trouvée(s) le ${DATE_CIBLE}:\n`,
  );

  visites.forEach((v, i) => {
    const marker = i === 0 ? "🟢 [GARDÉE]" : "🔴 [À FUSIONNER]";
    console.log(`${marker} Visite ${i + 1}`);
    console.log(`  id:          ${v.id}`);
    console.log(`  dateVisite:  ${v.dateVisite.toISOString()}`);
    console.log(`  createdAt:   ${v.createdAt.toISOString()}`);
    console.log(`  motifVisite: ${v.motifVisite}`);
    console.log(`  idActivite:  ${v.idActivite ?? "-"}`);
    console.log(`  idLieu:      ${v.idLieu ?? "-"}`);
    console.log(
      `  recap:       ${
        v.RecapVisite?.[0]
          ? `[${v.RecapVisite[0].formulaires.join(", ")}]`
          : "(aucun)"
      }`,
    );
    const counts = v._count;
    const entries = Object.entries(counts)
      .filter(([, n]) => (n as number) > 0)
      .map(([k, n]) => `${k}:${n}`);
    console.log(
      `  liés:        ${entries.length > 0 ? entries.join(", ") : "(aucun)"}`,
    );
    console.log("");
  });

  if (visites.length < 2) {
    console.log("ℹ️  Pas de doublon à fusionner.");
  } else {
    console.log(
      `➡️  Action de fusion: garder ${visites[0].id}, fusionner ${visites
        .slice(1)
        .map((v) => v.id)
        .join(", ")}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
